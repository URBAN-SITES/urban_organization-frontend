import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/modules/auth'
import type { UUID } from '@/shared/types'
import { sendRealtime } from '../composables/useChatSocket'
import {
  declineCall,
  joinCall,
  leaveCall,
  listIceServers,
  sendCallSignal,
  setCallMedia,
  startCall,
} from '../services'
import type { Call, CallEvent, CallKind, CallParticipant, CallSignalData } from '../types'

// same as the backend default (CALL_RING_SECONDS); the server also expires it
const RING_MS = 45_000
const FALLBACK_ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

export type CallPhase = 'idle' | 'incoming' | 'outgoing' | 'active'

/**
 * Voice/video calls of the chat (WebRTC mesh). The server rings and relays the handshake;
 * audio and video go straight between the browsers. Mounted once by the layout.
 */
export const useCallStore = defineStore('call', () => {
  const auth = useAuthStore()
  const call = ref<Call | null>(null)
  const phase = ref<CallPhase>('idle')
  const local = shallowRef<MediaStream | null>(null)
  const remote = shallowRef<Record<UUID, MediaStream>>({})
  const muted = ref(false)
  const videoOff = ref(false)
  const screenSharing = ref(false)
  const canShareScreen =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia

  const peers = new Map<UUID, RTCPeerConnection>()
  // one chain per peer: an offer must be applied before its ICE candidates
  const queues = new Map<UUID, Promise<void>>()
  let iceServers: RTCIceServer[] | null = null
  let screenTrack: MediaStreamTrack | null = null
  let ringTimer: ReturnType<typeof setTimeout> | undefined
  // events that arrive while POST /calls/ is still in flight
  let starting = false
  const early: CallEvent[] = []

  const others = computed<CallParticipant[]>(
    () => call.value?.participants.filter((p) => p.user_id !== auth.user?.id) ?? [],
  )

  function cleanup(): void {
    clearTimeout(ringTimer)
    peers.forEach((pc) => pc.close())
    peers.clear()
    queues.clear()
    local.value?.getTracks().forEach((track) => track.stop())
    screenTrack?.stop()
    screenTrack = null
    local.value = null
    remote.value = {}
    call.value = null
    phase.value = 'idle'
    muted.value = false
    videoOff.value = false
    screenSharing.value = false
    starting = false
    early.length = 0
  }

  async function getMedia(kind: CallKind): Promise<MediaStream | null> {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' })
    } catch {
      toast.error(
        kind === 'video'
          ? 'Permita o acesso ao microfone e à câmera para ligar.'
          : 'Permita o acesso ao microfone para ligar.',
      )
      return null
    }
  }

  function signal(to: UUID, data: CallSignalData): void {
    const id = call.value?.id
    if (!id) return
    if (!sendRealtime({ type: 'call.signal', call_id: id, to_user_id: to, data }))
      void sendCallSignal(id, to, data).catch(() => undefined)
  }

  function serial(userId: UUID, task: () => Promise<void>): void {
    const next = (queues.get(userId) ?? Promise.resolve()).then(task).catch((error) => {
      console.warn('call signaling failed', error)
    })
    queues.set(userId, next)
  }

  async function peer(userId: UUID): Promise<RTCPeerConnection> {
    const existing = peers.get(userId)
    if (existing) return existing
    iceServers ??= await listIceServers().catch(() => FALLBACK_ICE)
    const pc = new RTCPeerConnection({ iceServers })
    const stream = local.value
    stream?.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, stream)
      if (track.kind === 'video' && screenTrack) void sender.replaceTrack(screenTrack)
    })
    pc.onicecandidate = (event) => {
      if (event.candidate) signal(userId, { candidate: event.candidate.toJSON() })
    }
    pc.ontrack = (event) => {
      remote.value = {
        ...remote.value,
        [userId]: event.streams[0] ?? new MediaStream([event.track]),
      }
    }
    peers.set(userId, pc)
    return pc
  }

  function dropPeer(userId: UUID): void {
    peers.get(userId)?.close()
    peers.delete(userId)
    queues.delete(userId)
    const { [userId]: _gone, ...rest } = remote.value
    remote.value = rest
  }

  function offer(userId: UUID): void {
    serial(userId, async () => {
      const pc = await peer(userId)
      await pc.setLocalDescription(await pc.createOffer())
      if (pc.localDescription) signal(userId, { sdp: pc.localDescription.toJSON() })
    })
  }

  function onSignal(from: UUID, data: CallSignalData): void {
    serial(from, async () => {
      const pc = await peer(from)
      if (data.sdp) {
        await pc.setRemoteDescription(data.sdp)
        if (data.sdp.type === 'offer') {
          await pc.setLocalDescription(await pc.createAnswer())
          if (pc.localDescription) signal(from, { sdp: pc.localDescription.toJSON() })
        }
      } else if (data.candidate) {
        await pc.addIceCandidate(data.candidate).catch(() => undefined)
      }
    })
  }

  function updateParticipant(participant: CallParticipant): void {
    if (!call.value) return
    const list = call.value.participants
    const index = list.findIndex((p) => p.user_id === participant.user_id)
    if (index >= 0) list[index] = participant
    else list.push(participant)
  }

  function setState(userId: UUID, state: CallParticipant['state']): void {
    const participant = call.value?.participants.find((p) => p.user_id === userId)
    if (participant) participant.state = state
  }

  /** Rings the other people of a chat channel. */
  async function start(channelId: UUID, kind: CallKind): Promise<void> {
    if (phase.value !== 'idle') return void toast.error('Você já está em uma ligação.')
    const stream = await getMedia(kind)
    if (!stream) return
    local.value = stream
    videoOff.value = kind === 'audio'
    phase.value = 'outgoing'
    starting = true
    try {
      call.value = await startCall(channelId, kind)
    } catch (error) {
      cleanup()
      return void toast.error(error instanceof Error ? error.message : 'Erro na ligação.')
    }
    starting = false
    early.splice(0).forEach((event) => void handleEvent(event))
    ringTimer = setTimeout(() => {
      if (phase.value === 'outgoing') {
        toast('Ninguém atendeu a ligação.')
        void hangup()
      }
    }, RING_MS)
  }

  async function accept(): Promise<void> {
    const current = call.value
    if (!current || phase.value !== 'incoming') return
    clearTimeout(ringTimer)
    const stream = await getMedia(current.kind)
    if (!stream) return void decline()
    local.value = stream
    videoOff.value = current.kind === 'audio'
    try {
      call.value = await joinCall(current.id)
    } catch (error) {
      cleanup()
      return void toast.error(error instanceof Error ? error.message : 'A ligação já terminou.')
    }
    phase.value = 'active'
    // the newcomer offers to everyone already in
    for (const p of others.value) if (p.state === 'joined') offer(p.user_id)
  }

  async function decline(): Promise<void> {
    const id = call.value?.id
    cleanup()
    if (id) await declineCall(id)
  }

  async function hangup(): Promise<void> {
    const id = call.value?.id
    cleanup()
    if (id) await leaveCall(id)
  }

  function toggleMute(): void {
    muted.value = !muted.value
    local.value?.getAudioTracks().forEach((track) => (track.enabled = !muted.value))
    if (call.value) void setCallMedia(call.value.id, { muted: muted.value })
  }

  function toggleVideo(): void {
    videoOff.value = !videoOff.value
    local.value?.getVideoTracks().forEach((track) => (track.enabled = !videoOff.value))
    if (call.value) void setCallMedia(call.value.id, { video_off: videoOff.value })
  }

  function replaceVideo(track: MediaStreamTrack | null): void {
    peers.forEach((pc) => {
      pc.getSenders()
        .filter((sender) => sender.track?.kind === 'video' || sender.track === null)
        .forEach((sender) => void sender.replaceTrack(track))
    })
  }

  function stopScreen(): void {
    if (!screenTrack) return
    screenTrack.stop()
    screenTrack = null
    replaceVideo(local.value?.getVideoTracks()[0] ?? null)
    screenSharing.value = false
    if (call.value) void setCallMedia(call.value.id, { screen_sharing: false })
  }

  /** Screen sharing replaces the camera track of every connection (video calls only). */
  async function toggleScreen(): Promise<void> {
    if (screenSharing.value) return stopScreen()
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true })
      screenTrack = display.getVideoTracks()[0] ?? null
    } catch {
      return // the person closed the picker
    }
    if (!screenTrack) return
    screenTrack.onended = stopScreen // "stop sharing" from the browser bar
    replaceVideo(screenTrack)
    screenSharing.value = true
    if (call.value) void setCallMedia(call.value.id, { screen_sharing: true })
  }

  async function handleEvent(event: CallEvent): Promise<void> {
    if (event.type === 'call.ringing') {
      if (phase.value !== 'idle') return // busy: the caller sees it as missed
      call.value = event.call
      phase.value = 'incoming'
      ringTimer = setTimeout(() => {
        if (phase.value === 'incoming') cleanup()
      }, RING_MS)
      return
    }
    if (starting) return void early.push(event)
    if (!call.value || event.call_id !== call.value.id) return
    switch (event.type) {
      case 'call.participant_joined':
        updateParticipant(event.participant)
        if (phase.value === 'outgoing') {
          clearTimeout(ringTimer)
          phase.value = 'active'
        }
        break
      case 'call.media':
        updateParticipant(event.participant)
        break
      case 'call.participant_left':
      case 'call.declined':
        setState(event.user_id, event.type === 'call.declined' ? 'declined' : 'left')
        dropPeer(event.user_id)
        break
      case 'call.signal':
        if (phase.value === 'active') onSignal(event.from_user_id, event.data)
        break
      case 'call.ended':
        if (phase.value === 'outgoing' && event.status === 'declined')
          toast('A ligação foi recusada.')
        cleanup()
        break
      case 'call.error':
        console.warn('call error', event.detail)
        break
    }
  }

  return {
    call,
    phase,
    local,
    remote,
    muted,
    videoOff,
    screenSharing,
    canShareScreen,
    others,
    start,
    accept,
    decline,
    hangup,
    toggleMute,
    toggleVideo,
    toggleScreen,
    handleEvent,
    cleanup,
  }
})

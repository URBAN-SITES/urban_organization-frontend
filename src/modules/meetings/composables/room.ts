import {
  ConnectionState,
  DisconnectReason,
  type Participant,
  Room,
  RoomEvent,
  Track,
  type TrackPublication,
} from 'livekit-client'
import { computed, markRaw, onBeforeUnmount, ref, shallowRef } from 'vue'
import { mediaProblem } from '../utils'

export type RoomState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface Tile {
  key: string
  participant: Participant
  publication: TrackPublication | undefined
  screen: boolean
}

/** Uma sala LiveKit reativa: participantes, mídia local, estados e gravação. */
export function useMeetingRoom() {
  const room = shallowRef<Room | null>(null)
  const state = ref<RoomState>('idle')
  /** muda a cada evento da sala; as computeds leem para recalcular */
  const version = ref(0)
  const recording = ref(false)
  const audioBlocked = ref(false)
  const mediaError = ref('')
  const leftReason = ref('')
  const busy = ref<'' | 'mic' | 'camera' | 'screen'>('')

  const touch = () => version.value++
  /** microfone e câmera podem falhar juntos ao entrar: guarda os dois avisos */
  const report = (message: string) => {
    if (!mediaError.value.includes(message))
      mediaError.value = mediaError.value ? `${mediaError.value} ${message}` : message
  }

  const participants = computed<Participant[]>(() => {
    void version.value
    const current = room.value
    if (!current) return []
    return [current.localParticipant, ...current.remoteParticipants.values()]
  })

  const tiles = computed<Tile[]>(() =>
    participants.value.flatMap((participant) => {
      const camera: Tile = {
        key: `${participant.identity}:camera`,
        participant,
        publication: participant.getTrackPublication(Track.Source.Camera),
        screen: false,
      }
      const share = participant.getTrackPublication(Track.Source.ScreenShare)
      return share
        ? [
            {
              key: `${participant.identity}:screen`,
              participant,
              publication: share,
              screen: true,
            },
            camera,
          ]
        : [camera]
    }),
  )

  const local = computed(() => {
    void version.value
    const me = room.value?.localParticipant
    return {
      mic: !!me?.isMicrophoneEnabled,
      camera: !!me?.isCameraEnabled,
      screen: !!me?.isScreenShareEnabled,
    }
  })

  async function setMedia(kind: 'mic' | 'camera' | 'screen', enabled: boolean) {
    const me = room.value?.localParticipant
    if (!me || busy.value) return
    busy.value = kind
    try {
      if (kind === 'mic') await me.setMicrophoneEnabled(enabled)
      else if (kind === 'camera') await me.setCameraEnabled(enabled)
      else await me.setScreenShareEnabled(enabled, { audio: false })
    } catch (error) {
      const message = mediaProblem(
        error,
        kind === 'mic' ? 'microfone' : kind === 'camera' ? 'câmera' : 'tela',
      )
      report(message)
    } finally {
      busy.value = ''
      touch()
    }
  }

  async function connect(url: string, token: string, media: { mic: boolean; camera: boolean }) {
    const current = markRaw(new Room({ adaptiveStream: true, dynacast: true }))
    room.value = current
    state.value = 'connecting'
    leftReason.value = ''
    current
      .on(RoomEvent.ConnectionStateChanged, (next) => {
        state.value =
          next === ConnectionState.Connected
            ? 'connected'
            : next === ConnectionState.Disconnected
              ? 'disconnected'
              : next === ConnectionState.Connecting
                ? 'connecting'
                : 'reconnecting'
        touch()
      })
      .on(RoomEvent.RecordingStatusChanged, (value) => {
        recording.value = value
      })
      .on(RoomEvent.AudioPlaybackStatusChanged, () => {
        audioBlocked.value = !current.canPlaybackAudio
      })
      .on(RoomEvent.MediaDevicesError, (error, kind) => {
        report(mediaProblem(error, kind === 'audioinput' ? 'microfone' : 'câmera'))
      })
      .on(RoomEvent.Disconnected, (reason) => {
        // saída voluntária não é problema; queda, expulsão ou sala encerrada é
        leftReason.value =
          reason === undefined || reason === DisconnectReason.CLIENT_INITIATED
            ? ''
            : reason === DisconnectReason.DUPLICATE_IDENTITY
              ? 'duplicate'
              : 'lost'
      })
    for (const event of [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.ActiveSpeakersChanged,
      RoomEvent.ParticipantNameChanged,
    ])
      current.on(event, touch)

    await current.connect(url, token)
    recording.value = current.isRecording
    audioBlocked.value = !current.canPlaybackAudio
    touch()
    // um aparelho negado não impede de ficar na sala ouvindo os outros
    if (media.mic) await setMedia('mic', true)
    if (media.camera) await setMedia('camera', true)
  }

  async function enableAudio() {
    await room.value?.startAudio()
    audioBlocked.value = !(room.value?.canPlaybackAudio ?? true)
  }

  async function leave() {
    await room.value?.disconnect()
    state.value = 'disconnected'
  }

  onBeforeUnmount(() => void room.value?.disconnect())

  return {
    room,
    state,
    version,
    participants,
    tiles,
    local,
    recording,
    audioBlocked,
    mediaError,
    leftReason,
    busy,
    connect,
    setMedia,
    enableAudio,
    leave,
  }
}

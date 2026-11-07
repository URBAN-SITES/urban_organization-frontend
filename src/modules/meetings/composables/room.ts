import {
  ConnectionState,
  DisconnectReason,
  type LocalAudioTrack,
  type Participant,
  type RemoteTrack,
  Room,
  RoomEvent,
  ScreenSharePresets,
  Track,
  VideoPresets,
  type TrackPublication,
} from 'livekit-client'
import { computed, markRaw, onBeforeUnmount, ref, shallowRef } from 'vue'
import { mediaProblem } from '../utils'
import type { DeviceChoice, DeviceKind } from './devices'

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

  /** microfone publicado, para o medidor de volume */
  const micTrack = computed(() => {
    void version.value
    return room.value?.localParticipant.getTrackPublication(Track.Source.Microphone)?.audioTrack as
      LocalAudioTrack | undefined
  })

  // o som de cada pessoa toca num <audio> próprio, fora dos quadros de vídeo: assim
  // ninguém fica mudo porque o quadro dela saiu da tela ou trocou de lugar
  let speakers: HTMLElement | null = null
  function playRemote(track: RemoteTrack) {
    if (track.kind !== Track.Kind.Audio) return
    if (!speakers) {
      speakers = document.createElement('div')
      speakers.hidden = true
      document.body.append(speakers)
    }
    speakers.append(track.attach())
  }
  function stopRemote(track: RemoteTrack) {
    if (track.kind === Track.Kind.Audio) for (const element of track.detach()) element.remove()
  }
  function dropSpeakers() {
    speakers?.remove()
    speakers = null
  }

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
      else
        await me.setScreenShareEnabled(enabled, {
          audio: false,
          resolution: ScreenSharePresets.h1080fps15.resolution,
        })
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

  async function connect(
    url: string,
    token: string,
    media: { mic: boolean; camera: boolean },
    devices: DeviceChoice,
  ) {
    const current = markRaw(
      new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          deviceId: devices.audioinput || undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        // 720p a 30 fps: a câmera padrão do navegador costuma vir em 640x480
        videoCaptureDefaults: {
          deviceId: devices.videoinput || undefined,
          resolution: VideoPresets.h720.resolution,
        },
        publishDefaults: {
          videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
          // quem tem conexão fraca recebe uma camada menor sem travar os outros
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
          screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
          dtx: true,
          red: true,
        },
        audioOutput: { deviceId: devices.audiooutput || undefined },
      }),
    )
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
      .on(RoomEvent.TrackSubscribed, playRemote)
      .on(RoomEvent.TrackUnsubscribed, stopRemote)
      .on(RoomEvent.MediaDevicesError, (error, kind) => {
        report(mediaProblem(error, kind === 'audioinput' ? 'microfone' : 'câmera'))
      })
      .on(RoomEvent.Disconnected, (reason) => {
        dropSpeakers()
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

  /** Troca o aparelho no meio da reunião; vazio volta ao padrão do sistema. */
  async function switchDevice(kind: DeviceKind, deviceId: string) {
    const current = room.value
    if (!current) return
    try {
      await current.switchActiveDevice(kind, deviceId || 'default')
    } catch (error) {
      report(
        mediaProblem(
          error,
          kind === 'audioinput' ? 'microfone' : kind === 'videoinput' ? 'câmera' : 'alto-falante',
        ),
      )
    } finally {
      touch()
    }
  }

  async function enableAudio() {
    await room.value?.startAudio()
    audioBlocked.value = !(room.value?.canPlaybackAudio ?? true)
  }

  async function leave() {
    await room.value?.disconnect()
    state.value = 'disconnected'
  }

  onBeforeUnmount(() => {
    void room.value?.disconnect()
    dropSpeakers()
  })

  return {
    room,
    state,
    version,
    participants,
    tiles,
    local,
    micTrack,
    recording,
    audioBlocked,
    mediaError,
    leftReason,
    busy,
    connect,
    setMedia,
    switchDevice,
    enableAudio,
    leave,
  }
}

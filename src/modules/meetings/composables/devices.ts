import { Room, supportsAudioOutputSelection } from 'livekit-client'
import { onBeforeUnmount, ref } from 'vue'

export type DeviceKind = 'audioinput' | 'audiooutput' | 'videoinput'
export type DeviceChoice = Record<DeviceKind, string>

const STORAGE_KEY = 'uo:meeting-devices'
const KINDS: DeviceKind[] = ['audioinput', 'audiooutput', 'videoinput']

function saved(): DeviceChoice {
  const empty = { audioinput: '', audiooutput: '', videoinput: '' }
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  } catch {
    return empty
  }
}

/**
 * Microfones, alto-falantes e câmeras do aparelho, com a escolha lembrada neste navegador.
 * Um aparelho que sumiu (fone desconectado) volta para o padrão do sistema.
 */
export function useMediaDevices() {
  const lists = ref<Record<DeviceKind, MediaDeviceInfo[]>>({
    audioinput: [],
    audiooutput: [],
    videoinput: [],
  })
  const choice = ref<DeviceChoice>(saved())
  /** o Safari e o Firefox não deixam escolher a saída de som */
  const canPickOutput = supportsAudioOutputSelection()

  async function refresh(ask = false) {
    const all = await Room.getLocalDevices(undefined, ask).catch(() => [])
    for (const kind of KINDS) {
      const found = all.filter((device) => device.kind === kind && device.deviceId)
      lists.value[kind] = found
      if (choice.value[kind] && !found.some((d) => d.deviceId === choice.value[kind]))
        choice.value[kind] = ''
    }
  }

  function pick(kind: DeviceKind, deviceId: string) {
    choice.value = { ...choice.value, [kind]: deviceId }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(choice.value))
    } catch {
      // modo privado: a escolha vale só nesta visita
    }
  }

  const onChange = () => void refresh()
  navigator.mediaDevices?.addEventListener('devicechange', onChange)
  onBeforeUnmount(() => navigator.mediaDevices?.removeEventListener('devicechange', onChange))

  return { lists, choice, canPickOutput, refresh, pick }
}

/** Toca um bipe curto no alto-falante escolhido (vazio: o padrão do sistema). */
export async function playTestSound(sinkId: string) {
  const context = new AudioContext()
  const destination = context.createMediaStreamDestination()
  const tone = context.createOscillator()
  const gain = context.createGain()
  tone.frequency.value = 660
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.3, context.currentTime + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.7)
  tone.connect(gain).connect(destination)
  const element = new Audio()
  element.srcObject = destination.stream
  try {
    if (sinkId && 'setSinkId' in element) await element.setSinkId(sinkId)
    await element.play()
    tone.start()
    tone.stop(context.currentTime + 0.75)
    await new Promise((resolve) => window.setTimeout(resolve, 800))
  } finally {
    element.srcObject = null
    await context.close()
  }
}

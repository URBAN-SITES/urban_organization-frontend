import { onScopeDispose, ref } from 'vue'

/** Grava uma mensagem de voz com o MediaRecorder do navegador. */
export function useVoiceRecorder() {
  const recording = ref(false)
  const seconds = ref(0)
  let recorder: MediaRecorder | undefined
  let stream: MediaStream | undefined
  let chunks: Blob[] = []
  let timer: ReturnType<typeof setInterval> | undefined

  function cleanup(): void {
    clearInterval(timer)
    stream?.getTracks().forEach((track) => track.stop())
    stream = undefined
    recorder = undefined
    recording.value = false
  }

  /** false quando o navegador não grava ou a pessoa negou o microfone. */
  async function start(): Promise<boolean> {
    if (recording.value) return true
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices) return false
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return false
    }
    chunks = []
    recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data)
    }
    recorder.start()
    seconds.value = 0
    recording.value = true
    timer = setInterval(() => (seconds.value += 1), 1000)
    return true
  }

  /** Para e devolve o áudio como arquivo (null se nada foi gravado). */
  function stop(): Promise<File | null> {
    const current = recorder
    if (!current || current.state === 'inactive') {
      cleanup()
      return Promise.resolve(null)
    }
    return new Promise((resolve) => {
      current.onstop = () => {
        // Chrome/Firefox gravam webm/opus; o Safari, mp4
        const type = (current.mimeType || 'audio/webm').split(';')[0] || 'audio/webm'
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(chunks, { type })
        cleanup()
        resolve(blob.size ? new File([blob], `audio-${Date.now()}.${ext}`, { type }) : null)
      }
      current.stop()
    })
  }

  function cancel(): void {
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = cleanup
      recorder.stop()
    } else cleanup()
  }

  onScopeDispose(cancel)
  return { recording, seconds, start, stop, cancel }
}

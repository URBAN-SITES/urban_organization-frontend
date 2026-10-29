import type { Meeting, RecordingStatus } from '../types'

export type MeetingErrorCode =
  'meetings_not_configured' | 'recordings_not_configured' | 'livekit_unavailable'

const MESSAGES: Record<MeetingErrorCode, string> = {
  meetings_not_configured:
    'As reuniões ainda não foram configuradas no servidor. Veja o docs/REUNIOES.md do backend.',
  recordings_not_configured: 'O armazenamento das gravações ainda não foi configurado no servidor.',
  livekit_unavailable: 'O servidor de vídeo não respondeu. Tente de novo em instantes.',
}

/** Lê o `code` estável do backend; sem ele, usa o `detail` ou o primeiro erro de campo. */
export function meetingProblem(
  data: unknown,
  fallback: string,
): { code: MeetingErrorCode | null; message: string } {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  if (typeof record.code === 'string' && record.code in MESSAGES) {
    const code = record.code as MeetingErrorCode
    return { code, message: MESSAGES[code] }
  }
  if (typeof record.detail === 'string') return { code: null, message: record.detail }
  const first = Object.values(record).flat()[0]
  return { code: null, message: typeof first === 'string' ? first : fallback }
}

type Device = 'microfone' | 'câmera' | 'tela'
const NAMES: Record<Device, { the: string; none: string }> = {
  microfone: { the: 'o microfone', none: 'Nenhum microfone encontrado' },
  câmera: { the: 'a câmera', none: 'Nenhuma câmera encontrada' },
  tela: { the: 'a tela', none: 'Nenhuma tela disponível' },
}

/** Explica por que o navegador não entregou microfone, câmera ou tela. */
export function mediaProblem(error: unknown, device: Device): string {
  const name = error instanceof Error ? error.name : ''
  const { the, none } = NAMES[device]
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return device === 'tela'
      ? 'O compartilhamento de tela foi cancelado ou bloqueado.'
      : `O navegador bloqueou ${the}. Libere a permissão no cadeado da barra de endereço e tente de novo.`
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return `${none} neste dispositivo.`
  if (name === 'NotReadableError' || name === 'AbortError')
    return `${the[0]!.toUpperCase()}${the.slice(1)} está em uso por outro aplicativo. Feche-o e tente de novo.`
  return `Não foi possível usar ${the}.`
}

export type MeetingPhase = 'upcoming' | 'live' | 'past'

/** "Ao vivo" abre 10 minutos antes do horário marcado. */
export function meetingPhase(meeting: Pick<Meeting, 'starts_at' | 'ends_at'>, now = new Date()) {
  const starts = new Date(meeting.starts_at).getTime() - 10 * 60 * 1000
  const ends = new Date(meeting.ends_at).getTime()
  const time = now.getTime()
  const phase: MeetingPhase = time > ends ? 'past' : time >= starts ? 'live' : 'upcoming'
  return phase
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Data e horas locais (inputs date/time) → ISO com fuso. */
export function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString()
}

/** ISO → { date: 'AAAA-MM-DD', time: 'HH:MM' } no fuso local. */
export function fromIso(value: string): { date: string; time: string } {
  const d = new Date(value)
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

/** "qui, 30 de out · 14:00–15:00" */
export function meetingWhen(meeting: Pick<Meeting, 'starts_at' | 'ends_at'>): string {
  const starts = new Date(meeting.starts_at)
  const ends = new Date(meeting.ends_at)
  const day = starts
    .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
    .replace(/\./g, '')
  const hour = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${hour(starts)}–${hour(ends)}`
}

export const RECORDING_STATUS: Record<
  RecordingStatus,
  { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }
> = {
  starting: { label: 'Iniciando', tone: 'warning' },
  recording: { label: 'Gravando', tone: 'danger' },
  processing: { label: 'Processando', tone: 'warning' },
  ready: { label: 'Pronta', tone: 'success' },
  failed: { label: 'Falhou', tone: 'danger' },
}

export function recordingError(error: string): string {
  if (!error) return ''
  if (error === 'limit_reached')
    return 'A gravação parou no limite de duração do servidor de vídeo. O trecho gravado foi salvo.'
  return `A gravação falhou: ${error}`
}

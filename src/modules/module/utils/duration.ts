/** "25 min", "1 h", "2 h 05 min" a partir de minutos inteiros. */
export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.round(total))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${String(rest).padStart(2, '0')} min` : `${hours} h`
}

/** Relógio do cronômetro: "04:07" abaixo de uma hora, "1:04:07" depois. */
export function clock(startedAt: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const h = Math.floor(seconds / 3600)
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return h ? `${h}:${m}:${s}` : `${m}:${s}`
}

/**
 * Lê o que a pessoa digitou no lançamento manual: "45", "45m", "1h", "1h30", "1:30", "1,5h".
 * Devolve minutos (1 a 1440) ou null quando não dá para entender.
 */
export function parseDuration(text: string): number | null {
  const value = text.trim().toLowerCase().replace(/\s+/g, '').replace(',', '.')
  if (!value) return null
  let minutes: number | null = null
  const colon = /^(\d+):([0-5]\d)$/.exec(value)
  const hours = /^(\d+(?:\.\d+)?)h(?:(\d{1,2})(?:m|min)?)?$/.exec(value)
  const plain = /^(\d+)(?:m|min)?$/.exec(value)
  if (colon) minutes = Number(colon[1]) * 60 + Number(colon[2])
  else if (hours) minutes = Math.round(Number(hours[1]) * 60) + Number(hours[2] ?? 0)
  else if (plain) minutes = Number(plain[1])
  return minutes && minutes >= 1 && minutes <= 1440 ? minutes : null
}

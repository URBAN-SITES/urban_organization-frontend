import type { Cycle, Task } from '../types'

/** Cálculos da linha do tempo: datas ISO (AAAA-MM-DD) tratadas como dias em UTC. */
const DAY = 86_400_000
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export interface DaySpan {
  start: string
  end: string
}
export interface TimelineRange {
  /** primeiro dia (sempre uma segunda-feira, para a grade semanal) */
  start: string
  days: number
}

const parse = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const iso = (time: number) => new Date(time).toISOString().slice(0, 10)

export const addDays = (day: string, count: number) => iso(parse(day) + count * DAY)
export const diffDays = (from: string, to: string) => Math.round((parse(to) - parse(from)) / DAY)

export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Período da tarefa: início até o prazo; só uma das datas vira um dia. Sem datas: null. */
export function taskSpan(task: Pick<Task, 'start_date' | 'due_date'>): DaySpan | null {
  const start = task.start_date ?? task.due_date
  const end = task.due_date ?? task.start_date
  if (!start || !end) return null
  return start <= end ? { start, end } : { start: end, end: start }
}

/**
 * Janela que cabe todas as tarefas, ciclos e hoje, com folga nas pontas,
 * começando numa segunda-feira e com pelo menos `minDays` dias.
 */
export function timelineRange(
  spans: DaySpan[],
  cycles: Pick<Cycle, 'start_date' | 'end_date'>[],
  today: string,
  minDays = 35,
): TimelineRange {
  const days = [today]
  for (const span of spans) days.push(span.start, span.end)
  for (const cycle of cycles) days.push(cycle.start_date, cycle.end_date)
  days.sort()
  let start = addDays(days[0]!, -3)
  const weekday = (new Date(parse(start)).getUTCDay() + 6) % 7 // 0 = segunda
  start = addDays(start, -weekday)
  const end = addDays(days[days.length - 1]!, 7)
  const total = Math.max(minDays, diffDays(start, end) + 1)
  return { start, days: Math.ceil(total / 7) * 7 }
}

/** Posição de um período na janela, em dias (offset a partir do início e duração). */
export function place(span: DaySpan, range: TimelineRange) {
  return { offset: diffDays(range.start, span.start), length: diffDays(span.start, span.end) + 1 }
}

/** Faixas de mês do cabeçalho. */
export function monthBands(range: TimelineRange) {
  const bands: { label: string; offset: number; length: number }[] = []
  for (let offset = 0; offset < range.days;) {
    const date = new Date(parse(addDays(range.start, offset)))
    const month = date.getUTCMonth()
    const nextMonth = Date.UTC(date.getUTCFullYear(), month + 1, 1)
    const length = Math.min(range.days - offset, Math.round((nextMonth - date.getTime()) / DAY))
    bands.push({ label: `${MONTHS[month]} ${date.getUTCFullYear()}`, offset, length })
    offset += length
  }
  return bands
}

/** Move ou estica um período por `delta` dias; nunca deixa o fim antes do início. */
export function shiftSpan(span: DaySpan, mode: 'move' | 'start' | 'end', delta: number): DaySpan {
  if (mode === 'move') return { start: addDays(span.start, delta), end: addDays(span.end, delta) }
  if (mode === 'start') {
    const start = addDays(span.start, delta)
    return { start: start > span.end ? span.end : start, end: span.end }
  }
  const end = addDays(span.end, delta)
  return { start: span.start, end: end < span.start ? span.start : end }
}

/** Situação de um ciclo a partir das datas, como o servidor calcula. */
export function cycleProgress(cycle: Pick<Cycle, 'start_date' | 'end_date'>, today: string) {
  const total = diffDays(cycle.start_date, cycle.end_date) + 1
  if (today < cycle.start_date)
    return { label: `começa em ${diffDays(today, cycle.start_date)} d`, elapsed: 0 }
  if (today > cycle.end_date) return { label: 'encerrado', elapsed: 100 }
  const left = diffDays(today, cycle.end_date)
  return {
    label: left === 0 ? 'último dia' : `faltam ${left} d`,
    elapsed: Math.round(((total - left) * 100) / total),
  }
}

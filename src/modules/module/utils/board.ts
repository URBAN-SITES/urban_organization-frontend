import { FileText, HardDrive, Link2, Paperclip, Video } from '@lucide/vue'
import type { Component } from 'vue'
import type { TaskPriority } from '@/shared/types'
import type { Task, TaskFilters } from '../types'

export interface BoardFilters {
  /** '' todos · 'me' minhas · 'none' sem responsável · ou o id de uma pessoa */
  assignee: string
  /** 'high+' = alta ou urgente */
  priority: '' | TaskPriority | 'high+'
  due: '' | 'overdue' | 'today' | 'week' | 'none'
  /** id de uma etiqueta */
  label: string
  /** '' todos · 'none' fora de ciclos · ou o id de um ciclo */
  cycle: string
  /** '' todos · 'none' fora de épicos · ou o id de um épico */
  epic: string
}

export const NO_FILTERS: BoardFilters = {
  assignee: '',
  priority: '',
  due: '',
  label: '',
  cycle: '',
  epic: '',
}

export const activeFilters = (f: BoardFilters) => Object.values(f).filter(Boolean).length

const norm = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Dias entre hoje e a entrega (negativo = já passou). */
export function daysUntil(due: string, now = new Date()): number {
  const day = 86_400_000
  return Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${isoDay(now)}T00:00:00Z`)) / day)
}

export function dueLabel(task: Pick<Task, 'due_date' | 'completed_at'>, now = new Date()): string {
  if (!task.due_date || task.completed_at) return ''
  const days = daysUntil(task.due_date, now)
  if (days === 0) return 'vence hoje'
  const abs = Math.abs(days)
  const unit = abs === 1 ? 'dia' : 'dias'
  return days > 0 ? `faltam ${abs} ${unit}` : `atrasada há ${abs} ${unit}`
}

/** Aplica os filtros e a busca (título, descrição, responsável) às tarefas do quadro. */
export function filterTasks(
  tasks: Task[],
  filters: BoardFilters,
  search: string,
  userId: string | null,
  now = new Date(),
): Task[] {
  const needle = norm(search.trim())
  return tasks.filter((task) => {
    const { assignee, priority, due, label, cycle, epic } = filters
    if (label && !task.labels.some((item) => item.id === label)) return false
    if (cycle === 'none' && task.cycle_id) return false
    if (cycle && cycle !== 'none' && task.cycle_id !== cycle) return false
    if (epic === 'none' && task.epic_id) return false
    if (epic && epic !== 'none' && task.epic_id !== epic) return false
    if (assignee === 'me' && task.assignee_id !== userId) return false
    if (assignee === 'none' && task.assignee_id) return false
    if (assignee && assignee !== 'me' && assignee !== 'none' && task.assignee_id !== assignee)
      return false
    if (priority === 'high+' && task.priority !== 'high' && task.priority !== 'urgent') return false
    if (priority && priority !== 'high+' && task.priority !== priority) return false
    if (due === 'overdue' && !task.is_overdue) return false
    if (due === 'none' && task.due_date) return false
    if (due === 'today' || due === 'week') {
      if (!task.due_date) return false
      const days = daysUntil(task.due_date, now)
      if (days < 0 || days > (due === 'today' ? 0 : 6)) return false
    }
    return (
      !needle ||
      norm(
        `${task.title} ${task.description} ${task.assignee_name ?? ''} ${task.labels.map((item) => item.name).join(' ')}`,
      ).includes(needle)
    )
  })
}

export type LinkOrigin = 'drive' | 'docs' | 'meet' | 'upload' | 'link'

export const LINK_ORIGINS: Record<LinkOrigin, { label: string; icon: Component }> = {
  drive: { label: 'Google Drive', icon: HardDrive },
  docs: { label: 'Google Docs', icon: FileText },
  meet: { label: 'Google Meet', icon: Video },
  upload: { label: 'Arquivo', icon: Paperclip },
  link: { label: 'Link', icon: Link2 },
}

export function linkOrigin(url: string): LinkOrigin {
  try {
    const host = new URL(url).hostname
    if (host === 'drive.google.com') return 'drive'
    if (host === 'docs.google.com') return 'docs'
    if (host === 'meet.google.com') return 'meet'
    if (host.endsWith('cloudinary.com')) return 'upload'
  } catch {
    // url inválida cai em "link"
  }
  return 'link'
}

/** Os mesmos filtros do quadro como parâmetros da API (tabela paginada no servidor). */
export function serverFilters(
  filters: BoardFilters,
  search: string,
  userId: string | null,
  now = new Date(),
): TaskFilters {
  const params: TaskFilters = { parent__isnull: true }
  const { assignee, priority, due, label, cycle, epic } = filters
  if (assignee === 'me' && userId) params.assignee = userId
  else if (assignee === 'none') params.assignee__isnull = true
  else if (assignee && assignee !== 'me') params.assignee = assignee
  if (priority === 'high+') params.priority__in = 'high,urgent'
  else if (priority) params.priority = priority
  if (due === 'overdue') params.overdue = true
  else if (due === 'none') params.due_date__isnull = true
  else if (due === 'today' || due === 'week') {
    const end = new Date(now)
    end.setDate(end.getDate() + (due === 'today' ? 0 : 6))
    params.due_after = isoDay(now)
    params.due_before = isoDay(end)
  }
  if (label) params.label = label
  if (cycle === 'none') params.cycle__isnull = true
  else if (cycle) params.cycle = cycle
  if (epic === 'none') params.epic__isnull = true
  else if (epic) params.epic = epic
  if (search.trim()) params.search = search.trim()
  return params
}

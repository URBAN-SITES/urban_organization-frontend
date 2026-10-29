import type { AppNotification } from '../types'

// O backend envia estes títulos em inglês; traduzimos os que ele gera hoje.
const titles: Record<string, string> = {
  'You were assigned to a task': 'Você foi atribuído a uma tarefa',
  'New comment on your task': 'Novo comentário na sua tarefa',
  'Your task changed status': 'Sua tarefa mudou de status',
  'You were mentioned in a comment': 'Você foi mencionado em um comentário',
  'You were added to an organization': 'Você entrou em uma organização',
  'You were removed from an organization': 'Você saiu de uma organização',
  'Your organization role changed': 'Seu papel na organização mudou',
  'You were invited to an organization': 'Você recebeu um convite para uma organização',
  'Your organization invitation was accepted': 'Seu convite foi aceito',
}

export function notificationTitle(title: string): string {
  const mention = title.match(/^(.+) mentioned you$/)
  return mention ? `${mention[1]} mencionou você` : (titles[title] ?? title)
}

const text = (value: unknown) => (typeof value === 'string' && value ? value : null)

// Para onde a notificação leva, a partir do que o backend guarda em `data`.
export function notificationPath(data: AppNotification['data']): string {
  const event = text(data.event) ?? ''
  const sector = text(data.sector_id)
  const task = text(data.task_id)
  const organization = text(data.organization_id)
  if (data.channel_id) return '/chat'
  if (sector && task) return `/setores/${sector}?task=${task}`
  if (event === 'organization.invited' || event === 'organization.member_removed')
    return '/organizacoes'
  if (event.startsWith('organization.') && organization)
    return `/organizacoes/${organization}/membros`
  return '/notificacoes'
}

export type NotificationKind =
  'mention' | 'assigned' | 'comment' | 'status' | 'organization' | 'other'

// O tipo sai do `event` que o backend grava; notificações antigas caem no título.
export function notificationKind(item: Pick<AppNotification, 'title' | 'data'>): NotificationKind {
  const event = text(item.data.event) ?? ''
  if (item.data.channel_id || event.endsWith('.mentioned')) return 'mention'
  if (event === 'task.assigned' || item.title === 'You were assigned to a task') return 'assigned'
  if (event === 'task.commented' || item.title === 'New comment on your task') return 'comment'
  if (event === 'task.status_changed') return 'status'
  if (event.startsWith('organization.')) return 'organization'
  return 'other'
}

// Quem fez a ação, quando o título o cita ("Ana mentioned you"); sem nome devolve null.
export function notificationActor(title: string): string | null {
  return title.match(/^(.+) mentioned you$/)?.[1] ?? null
}

/** Agrupa por dia para a central: Hoje, Ontem ou a data. */
export function dayLabel(iso: string, now = new Date()): string {
  const day = new Date(iso)
  const start = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diff = Math.round((start(now) - start(day)) / 86_400_000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  return day.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

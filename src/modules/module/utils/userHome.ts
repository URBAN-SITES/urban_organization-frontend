import type { Dashboard, DashboardActivity } from '../types'

const dayMs = 86_400_000

export type DueTone = 'danger' | 'warning' | 'neutral'

/** Variação percentual real entre duas semanas; null quando não há base de comparação. */
export function weekChange(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) * 100) / previous)
}

export function kpis(d: Dashboard) {
  const delta = d.done_this_week - d.done_last_week
  return [
    {
      key: 'projects',
      title: 'Projetos ativos',
      value: d.active_projects,
      description: d.active_projects === 1 ? '1 projeto visível' : 'que você pode ver',
      change: null,
    },
    {
      key: 'progress',
      title: 'Em andamento',
      value: d.in_progress,
      description: `${d.open_tasks} abertas no total`,
      change: null,
    },
    {
      key: 'done',
      title: 'Concluídas na semana',
      value: d.done_this_week,
      description:
        delta === 0
          ? 'Igual à semana anterior'
          : `${delta > 0 ? '+' : ''}${delta} em relação à anterior`,
      change: weekChange(d.done_this_week, d.done_last_week),
    },
    {
      key: 'members',
      title: 'Membros da equipe',
      value: d.members,
      description: d.members === 1 ? 'só você por enquanto' : 'na organização',
      change: null,
    },
  ]
}

/** "Hoje", "Amanhã" ou a data curta, para a agenda. */
export function dayLabel(iso: string, today: Date = new Date()): string {
  const day = new Date(iso)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const diff = Math.floor((day.getTime() - start) / dayMs)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  return day.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

/** Estado de uma reunião em relação a agora: em andamento, começa em breve ou depois. */
export function meetingState(
  startsAt: string,
  endsAt: string,
  now: number = Date.now(),
): 'live' | 'soon' | 'later' {
  const start = Date.parse(startsAt)
  if (start <= now && Date.parse(endsAt) >= now) return 'live'
  return start - now <= 60 * 60_000 ? 'soon' : 'later'
}

export function duration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

// `today` é a data local de referência (YYYY-MM-DD); due_date vem sem fuso.
export function dueBadge(
  dueDate: string,
  isOverdue: boolean,
  today: string,
): { label: string; tone: DueTone } {
  if (isOverdue) return { label: 'Atrasada', tone: 'danger' }
  const days = Math.round((Date.parse(dueDate) - Date.parse(today)) / dayMs)
  return days === 0 ? { label: 'Hoje', tone: 'warning' } : { label: 'Amanhã', tone: 'neutral' }
}

export function weekLabel(weekStart: string): string {
  return new Date(`${weekStart}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

const FIELD_VERBS: Record<string, string> = {
  title: 'renomeou',
  description: 'editou a descrição de',
  priority: 'mudou a prioridade de',
  due_date: 'mudou o prazo de',
}

/**
 * Frase do histórico sem o nome de quem fez e sem o título da tarefa:
 * { verb: 'moveu', target: 'para Em andamento' } vira "Ana moveu <tarefa> para Em andamento".
 */
export function activityText(activity: Pick<DashboardActivity, 'action' | 'changes'>): {
  verb: string
  target?: string
} {
  const { action, changes } = activity
  if (action === 'created') return { verb: 'criou' }
  if (action === 'deleted') return { verb: 'excluiu' }
  if (action === 'commented') return { verb: 'comentou em' }

  const fields = Object.keys(changes)
  const status = changes.status
  if (action === 'moved' && status) return { verb: 'moveu', target: `para ${String(status[1])}` }
  if (fields.length === 1) {
    const field = fields[0]!
    const assignee = changes.assignee
    if (assignee) {
      return assignee[1]
        ? { verb: 'atribuiu', target: `a ${String(assignee[1])}` }
        : { verb: 'removeu o responsável de' }
    }
    if (FIELD_VERBS[field]) return { verb: FIELD_VERBS[field] }
  }
  return { verb: 'editou' }
}

/** Painéis do início que a pessoa pode esconder (a chave vai para hidden_widgets). */
export const HOME_WIDGETS = [
  { key: 'kpis', label: 'Indicadores', hint: 'Os quatro números sobre a foto do topo' },
  { key: 'projects', label: 'Projetos recentes', hint: 'Atalhos e progresso dos projetos' },
  { key: 'mine', label: 'Minhas tarefas', hint: 'Abertas e concluídas com você' },
  { key: 'agenda', label: 'Agenda', hint: 'Próximas reuniões' },
  { key: 'weekly', label: 'Concluídas pela equipe', hint: 'Entregas por semana' },
  { key: 'open', label: 'Abertas por projeto', hint: 'Onde está o trabalho aberto' },
  { key: 'insights', label: 'Reuniões e IA', hint: 'Resumos das gravações' },
  { key: 'activity', label: 'Atividade recente', hint: 'O que mudou nos projetos' },
] as const

/** Quantas colunas cada linha do início usa, contando só os painéis visíveis. */
export function visibleIn(keys: readonly string[], hidden: readonly string[]): number {
  return keys.filter((key) => !hidden.includes(key)).length
}

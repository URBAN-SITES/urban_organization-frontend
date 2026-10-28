import type { Dashboard, DashboardActivity } from '../types'

const dayMs = 86_400_000

export type DueTone = 'danger' | 'warning' | 'neutral'

export function kpis(d: Dashboard) {
  const delta = d.done_this_week - d.done_last_week
  return [
    {
      key: 'projects',
      title: 'Projetos ativos',
      value: d.active_projects,
      description: d.active_projects === 1 ? '1 projeto visível' : 'que você pode ver',
    },
    {
      key: 'progress',
      title: 'Em andamento',
      value: d.in_progress,
      description: `${d.open_tasks} abertas no total`,
    },
    {
      key: 'done',
      title: 'Concluídas na semana',
      value: d.done_this_week,
      description:
        delta === 0
          ? 'Igual à semana anterior'
          : `${delta > 0 ? '+' : ''}${delta} em relação à anterior`,
    },
    {
      key: 'overdue',
      title: 'Atrasadas',
      value: d.overdue,
      description: d.overdue_title ?? 'Nada atrasado',
    },
  ]
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

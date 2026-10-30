import type { ISODate, ISODateTime, UUID } from '@/shared/types'

export type ActivityAction = 'created' | 'updated' | 'moved' | 'commented' | 'deleted'

/** Mudanças de um registro do histórico: campo -> [antes, depois], já em texto. */
export type ActivityChanges = Partial<Record<string, [unknown, unknown]>> & {
  comment?: string
}

export interface DashboardActivity {
  id: UUID
  action: ActivityAction
  changes: ActivityChanges
  actor_name: string | null
  task_id: UUID
  task_title: string
  sector_id: UUID
  sector_name: string
  created_at: ISODateTime
}

export interface DashboardFavorite {
  id: UUID
  name: string
  color: string
  task_total: number
  task_done: number
}

export interface DashboardMeeting {
  id: UUID
  title: string
  starts_at: ISODateTime
  ends_at: ISODateTime
  sector_id: UUID
  sector_name: string
  participant_count: number
  /** primeiros nomes da lista de participantes */
  participants: string[]
}

/** Resumo de IA pronto de uma gravação. */
export interface DashboardInsight {
  meeting_id: UUID
  recording_id: UUID
  meeting_title: string
  sector_name: string
  finished_at: ISODateTime | null
  duration_seconds: number
  excerpt: string
  action_count: number
  decision_count: number
}

/** GET /organizations/:id/dashboard/ — limited to the sectors the user can see. */
export interface Dashboard {
  active_projects: number
  members: number
  upcoming_meetings: DashboardMeeting[]
  recent_insights: DashboardInsight[]
  in_progress: number
  favorites: DashboardFavorite[]
  recent_activity: DashboardActivity[]
  open_tasks: number
  due_this_week: number
  done_this_week: number
  done_last_week: number
  overdue: number
  overdue_title: string | null
  today: {
    id: UUID
    title: string
    sector_id: UUID
    sector_name: string
    due_date: ISODate
    is_overdue: boolean
  }[]
  weekly_done: { week_start: ISODate; done: number }[]
  open_by_sector: { sector: string; open: number }[]
}

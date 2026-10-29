import type { UUID, ISODate, ISODateTime, ITasks } from '@/shared/types'

export type { TaskPriority } from '@/shared/types'
export interface Label {
  id: UUID
  name: string
  color: string
}
export interface CreateLabelRequest {
  name: string
  color?: string
}
/** Tarefa do quadro: o contrato comum (ITasks) mais etiquetas e subtarefas. */
export interface Task extends ITasks {
  labels: Label[]
  subtask_total: number
  subtask_done: number
}
/** Quem pode ver o projeto: opções de responsável e de @menção. */
export interface Person {
  id: UUID
  name: string
  email: string
}
export type TaskActivityAction = 'created' | 'updated' | 'moved' | 'commented' | 'deleted'
export interface TaskActivity {
  id: UUID
  action: TaskActivityAction
  /** campo → [antes, depois]; em comentários, { comment: trecho } */
  changes: Record<string, [string | null, string | null] | string>
  actor_id: UUID | null
  actor_name: string | null
  created_at: ISODateTime
}
export type SectorRole = 'manager' | 'editor' | 'viewer'
export type StatusCategory = 'todo' | 'in_progress' | 'done'

export interface Sector {
  id: UUID
  organization_id: UUID
  name: string
  description: string
  icon: string
  color: string
  is_private: boolean
  archived_at: ISODateTime | null
  /** os campos abaixo vêm da listagem e do detalhe; ausentes em respostas de escrita antigas */
  is_favorite?: boolean
  task_total?: number | null
  task_done?: number | null
  /** o usuário é gestor (direto, por time ou admin da organização) */
  can_manage?: boolean
  created_at: ISODateTime
}
/** Query params de GET /organizations/:id/sectors/ (filtros e ordenação no servidor). */
export interface SectorListParams {
  archived?: boolean
  favorite?: boolean
  search?: string
  ordering?: 'name' | '-name' | 'created_at' | '-created_at'
}
export interface CreateSectorRequest {
  name: string
  description?: string
  icon?: string
  color?: string
  is_private?: boolean
}
export type UpdateSectorRequest = Partial<CreateSectorRequest>
export interface SectorMember {
  id: number
  user_id: UUID
  name: string
  email: string
  role: SectorRole
}
export interface AddSectorMemberRequest {
  user_id: UUID
  role?: SectorRole
}
export interface SectorTeam {
  id: number
  team_id: UUID
  team_name: string
  role: SectorRole
}
export interface AddSectorTeamRequest {
  team_id: UUID
  role?: SectorRole
}
export interface SectorProgress {
  total: number
  completed: number
  overdue: number
  percent: number
}
export interface Status {
  id: UUID
  name: string
  color: string
  category: StatusCategory
  position: number
  wip_limit: number | null
}
export interface CreateStatusRequest {
  name: string
  category: StatusCategory
  color?: string
  position?: number
  wip_limit?: number | null
}
export type UpdateStatusRequest = Partial<CreateStatusRequest>
export interface CreateTaskRequest {
  title: string
  description?: string
  priority?: Task['priority']
  due_date?: ISODate | null
  assignee?: UUID | null
  status?: UUID
  parent?: UUID
  label_ids?: UUID[]
}
export type UpdateTaskRequest = Partial<Omit<CreateTaskRequest, 'status' | 'parent'>>
export interface MoveTaskRequest {
  status: UUID
  position?: number
}
export interface ChecklistItem {
  id: UUID
  content: string
  is_done: boolean
  position: number
}
export interface CreateChecklistItemRequest {
  content: string
  is_done?: boolean
  position?: number
}
export type UpdateChecklistItemRequest = Partial<CreateChecklistItemRequest>
export interface Comment {
  id: UUID
  author_id: UUID
  author_name: string
  content: string
  mentions: { id: UUID; name: string }[]
  created_at: ISODateTime
}
export interface WriteCommentRequest {
  content: string
  mentions?: UUID[]
}
export interface ResourceLink {
  id: UUID
  title: string
  url: string
  created_by_id: UUID
  created_at: ISODateTime
}
export interface CreateResourceLinkRequest {
  title?: string
  url: string
}
export type UpdateResourceLinkRequest = Partial<CreateResourceLinkRequest>

/** Query params of GET /sectors/:id/tasks/ (django-filter + search + ordering). */
export interface TaskFilters {
  status?: string
  assignee?: string
  assignee__isnull?: boolean
  priority?: Task['priority']
  /** várias prioridades separadas por vírgula */
  priority__in?: string
  label?: string
  due_date__isnull?: boolean
  parent?: string
  parent__isnull?: boolean
  due_before?: string
  due_after?: string
  overdue?: boolean
  completed?: boolean
  search?: string
  ordering?: string
  page?: number
}

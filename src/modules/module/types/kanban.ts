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
  /** início planejado (linha do tempo); o fim é o due_date */
  start_date: ISODate | null
  cycle_id: UUID | null
  epic_id: UUID | null
  /** alguma tarefa que bloqueia esta ainda está aberta */
  is_blocked: boolean
  /** código curto do projeto + número (ex.: DEV-12) */
  key: string | null
  /** pontos de esforço */
  estimate: number | null
  /** '' não repete; ao concluir, a próxima nasce aberta com as datas adiante */
  recurrence: Recurrence
  archived_at: ISODateTime | null
}
export type Recurrence = '' | 'daily' | 'weekly' | 'monthly'
export type ViewLayout = 'board' | 'list' | 'table' | 'timeline'
/** Visão salva: filtros, busca e modo do quadro com um nome. */
export interface SavedView {
  id: UUID
  name: string
  layout: ViewLayout
  filters: Record<string, string>
  sort: string[]
  search: string
  is_shared: boolean
  position: number
  owner_id: UUID | null
  owner_name: string | null
  created_at: ISODateTime | null
}
export type SaveViewRequest = Pick<
  SavedView,
  'name' | 'layout' | 'filters' | 'search' | 'is_shared'
>
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'url'
export interface CustomFieldOption {
  id?: UUID
  name: string
  color?: string
}
export interface CustomField {
  id: UUID
  name: string
  type: CustomFieldType
  position: number
  options: CustomFieldOption[]
}
export interface WriteCustomFieldRequest {
  name: string
  type?: CustomFieldType
  options?: CustomFieldOption[]
}
export type FieldValue = string | number | boolean | null
export interface TaskFieldValue {
  field_id: UUID
  value: FieldValue
}
/** Modelo de tarefa: campos e checklist copiados ao criar. */
export interface TaskTemplate {
  id: UUID
  name: string
  title: string
  description: string
  priority: Task['priority']
  estimate: number | null
  label_ids: UUID[]
  checklist: string[]
  created_at: ISODateTime
}
export type WriteTemplateRequest = Omit<TaskTemplate, 'id' | 'created_at'>
/** Edição em massa: as mesmas regras de editar uma por uma. */
export interface BulkRequest {
  task_ids: UUID[]
  status?: UUID
  assignee?: UUID | null
  cycle?: UUID | null
  epic?: UUID | null
  priority?: Task['priority']
  due_date?: ISODate | null
  add_label?: UUID
  archive?: boolean
  delete?: boolean
}
export type EpicState = 'planned' | 'in_progress' | 'paused' | 'done' | 'cancelled'
/** Épico (módulo): um objetivo maior que agrupa tarefas do projeto. */
export interface Epic {
  id: UUID
  name: string
  description: string
  state: EpicState
  lead_id: UUID | null
  lead_name: string | null
  color: string
  start_date: ISODate | null
  target_date: ISODate | null
  task_total: number
  task_done: number
  points_total: number
  points_done: number
  created_at: ISODateTime
}
export interface WriteEpicRequest {
  name: string
  description?: string
  state?: EpicState
  lead?: UUID | null
  color?: string
  start_date?: ISODate | null
  target_date?: ISODate | null
}
/** Página (wiki) do projeto, em Markdown. */
export interface PageSummary {
  id: UUID
  title: string
  is_pinned: boolean
  excerpt: string
  updated_by_name: string | null
  updated_at: ISODateTime
}
export interface ProjectPage {
  id: UUID
  title: string
  content: string
  is_pinned: boolean
  created_by_name: string | null
  updated_by_name: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}
export type IntakeState = 'pending' | 'accepted' | 'declined'
/** Pedido enviado ao projeto: quem edita aceita (vira tarefa) ou recusa. */
export interface IntakeRequest {
  id: UUID
  title: string
  description: string
  state: IntakeState
  requester_name: string | null
  decided_by_name: string | null
  decision_note: string
  decided_at: ISODateTime | null
  task_id: UUID | null
  task_key: string | null
  created_at: ISODateTime
}
export type CycleState = 'upcoming' | 'current' | 'completed'
/** Ciclo (sprint) do projeto: um período com as tarefas que entram nele. */
export interface Cycle {
  id: UUID
  sector_id: UUID
  name: string
  description: string
  start_date: ISODate
  end_date: ISODate
  state: CycleState
  task_total: number
  task_done: number
  points_total: number
  points_done: number
  created_at: ISODateTime
}
export interface Burndown {
  start_date: ISODate
  end_date: ISODate
  total: number
  total_points: number
  days: { date: ISODate; remaining: number; remaining_points: number }[]
}
export interface TrashedTask {
  id: UUID
  title: string
  deleted_at: ISODateTime
  subtask_count: number
}
export interface FollowState {
  following: boolean
  followers: number
}
export interface CreateCycleRequest {
  name: string
  description?: string
  start_date: ISODate
  end_date: ISODate
}
export type UpdateCycleRequest = Partial<CreateCycleRequest>
export interface RelatedTask {
  id: UUID
  title: string
  status_name: string
  is_done: boolean
}
/** "Bloqueada por" e "bloqueando": os dois lados do mesmo vínculo. */
export interface TaskRelations {
  blocked_by: RelatedTask[]
  blocking: RelatedTask[]
}
export type RelationKind = keyof TaskRelations
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
  /** prefixo dos códigos das tarefas (ex.: DEV) */
  identifier?: string
  /** concluídas saem do quadro depois de N dias (null: nunca) */
  auto_archive_days?: number | null
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
  identifier?: string
  auto_archive_days?: number | null
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
  start_date?: ISODate | null
  due_date?: ISODate | null
  assignee?: UUID | null
  cycle?: UUID | null
  epic?: UUID | null
  estimate?: number | null
  recurrence?: Recurrence
  status?: UUID
  parent?: UUID
  label_ids?: UUID[]
  /** itens da checklist já na criação (modelos) */
  checklist?: string[]
}
export type UpdateTaskRequest = Partial<Omit<CreateTaskRequest, 'status' | 'parent' | 'checklist'>>
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
  cycle?: string
  cycle__isnull?: boolean
  epic?: string
  epic__isnull?: boolean
  due_before?: string
  due_after?: string
  overdue?: boolean
  completed?: boolean
  archived?: boolean
  key?: string
  search?: string
  ordering?: string
  page?: number
}

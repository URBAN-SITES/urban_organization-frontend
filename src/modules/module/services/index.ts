import { api } from '@/app/plugins/axios'
import type { Page } from '@/shared/types'
import type {
  AddSectorMemberRequest,
  ChecklistItem,
  Comment,
  CreateLabelRequest,
  Label,
  Person,
  TaskActivity,
  WriteCommentRequest,
  AddSectorTeamRequest,
  CreateChecklistItemRequest,
  CreateResourceLinkRequest,
  CreateSectorRequest,
  CreateStatusRequest,
  CreateTaskRequest,
  Burndown,
  BulkRequest,
  CustomField,
  FieldValue,
  SaveViewRequest,
  SavedView,
  TaskFieldValue,
  TaskTemplate,
  WriteCustomFieldRequest,
  WriteTemplateRequest,
  CreateCycleRequest,
  Cycle,
  FollowState,
  TrashedTask,
  Dashboard,
  RelationKind,
  TaskRelations,
  UpdateCycleRequest,
  MoveTaskRequest,
  ResourceLink,
  Sector,
  SectorMember,
  SectorRole,
  SectorTeam,
  SectorListParams,
  SectorProgress,
  Status,
  Task,
  TaskFilters,
  UpdateChecklistItemRequest,
  UpdateSectorRequest,
  UpdateStatusRequest,
  UpdateTaskRequest,
} from '../types'

const enc = encodeURIComponent

// ── Setores ────────────────────────────────────────────────────────────────
export async function listSectors(
  organizationId: string,
  page = 1,
  filters: SectorListParams = {},
): Promise<Page<Sector>> {
  return (
    await api.get<Page<Sector>>(`/organizations/${enc(organizationId)}/sectors/`, {
      params: { page, ...filters },
    })
  ).data
}

export async function setSectorFavorite(id: string, favorite: boolean): Promise<void> {
  if (favorite) await api.put(`/sectors/${enc(id)}/favorite/`)
  else await api.delete(`/sectors/${enc(id)}/favorite/`)
}

export async function setSectorArchived(id: string, archived: boolean): Promise<Sector> {
  const url = `/sectors/${enc(id)}/archive/`
  return (archived ? await api.put<Sector>(url) : await api.delete<Sector>(url)).data
}

export async function createSector(
  organizationId: string,
  payload: CreateSectorRequest,
): Promise<Sector> {
  return (await api.post<Sector>(`/organizations/${enc(organizationId)}/sectors/`, payload)).data
}

export async function getSector(id: string): Promise<Sector & { my_role: SectorRole }> {
  return (await api.get<Sector & { my_role: SectorRole }>(`/sectors/${enc(id)}/`)).data
}

export async function updateSector(id: string, payload: UpdateSectorRequest): Promise<Sector> {
  return (await api.patch<Sector>(`/sectors/${enc(id)}/`, payload)).data
}

export async function deleteSector(id: string): Promise<void> {
  await api.delete(`/sectors/${enc(id)}/`)
}

export async function getSectorProgress(id: string): Promise<SectorProgress> {
  return (await api.get<SectorProgress>(`/sectors/${enc(id)}/progress/`)).data
}

export async function listSectorMembers(id: string, page = 1): Promise<Page<SectorMember>> {
  return (await api.get<Page<SectorMember>>(`/sectors/${enc(id)}/members/`, { params: { page } }))
    .data
}

export async function addSectorMember(
  id: string,
  payload: AddSectorMemberRequest,
): Promise<SectorMember> {
  return (await api.post<SectorMember>(`/sectors/${enc(id)}/members/`, payload)).data
}

export async function removeSectorMember(id: string, memberId: number): Promise<void> {
  await api.delete(`/sectors/${enc(id)}/members/${memberId}/`)
}

export async function updateSectorMember(
  id: string,
  memberId: number,
  role: SectorRole,
): Promise<SectorMember> {
  return (await api.patch<SectorMember>(`/sectors/${enc(id)}/members/${memberId}/`, { role })).data
}

export async function updateSectorTeam(
  id: string,
  linkId: number,
  role: SectorRole,
): Promise<SectorTeam> {
  return (await api.patch<SectorTeam>(`/sectors/${enc(id)}/teams/${linkId}/`, { role })).data
}

// ── Colunas (status) ───────────────────────────────────────────────────────
export async function listStatuses(sectorId: string, page = 1): Promise<Page<Status>> {
  return (await api.get<Page<Status>>(`/sectors/${enc(sectorId)}/statuses/`, { params: { page } }))
    .data
}

export async function createStatus(
  sectorId: string,
  payload: CreateStatusRequest,
): Promise<Status> {
  return (await api.post<Status>(`/sectors/${enc(sectorId)}/statuses/`, payload)).data
}

export async function updateStatus(
  sectorId: string,
  statusId: string,
  payload: UpdateStatusRequest,
): Promise<Status> {
  return (await api.patch<Status>(`/sectors/${enc(sectorId)}/statuses/${enc(statusId)}/`, payload))
    .data
}

export async function deleteStatus(sectorId: string, statusId: string): Promise<void> {
  await api.delete(`/sectors/${enc(sectorId)}/statuses/${enc(statusId)}/`)
}

// ── Tasks ──────────────────────────────────────────────────────────────────
export async function listTasks(sectorId: string, filters: TaskFilters = {}): Promise<Page<Task>> {
  return (await api.get<Page<Task>>(`/sectors/${enc(sectorId)}/tasks/`, { params: filters })).data
}

export async function createTask(sectorId: string, payload: CreateTaskRequest): Promise<Task> {
  return (await api.post<Task>(`/sectors/${enc(sectorId)}/tasks/`, payload)).data
}

export async function getTask(id: string): Promise<Task> {
  return (await api.get<Task>(`/tasks/${enc(id)}/`)).data
}

export async function updateTask(id: string, payload: UpdateTaskRequest): Promise<Task> {
  return (await api.patch<Task>(`/tasks/${enc(id)}/`, payload)).data
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${enc(id)}/`)
}

export async function moveTask(id: string, payload: MoveTaskRequest): Promise<Task> {
  return (await api.post<Task>(`/tasks/${enc(id)}/move/`, payload)).data
}

// ── Checklist e comentários ────────────────────────────────────────────────
export async function listChecklist(taskId: string, page = 1): Promise<Page<ChecklistItem>> {
  return (
    await api.get<Page<ChecklistItem>>(`/tasks/${enc(taskId)}/checklist/`, { params: { page } })
  ).data
}

export async function createChecklistItem(
  taskId: string,
  payload: CreateChecklistItemRequest,
): Promise<ChecklistItem> {
  return (await api.post<ChecklistItem>(`/tasks/${enc(taskId)}/checklist/`, payload)).data
}

export async function updateChecklistItem(
  taskId: string,
  itemId: string,
  payload: UpdateChecklistItemRequest,
): Promise<ChecklistItem> {
  return (
    await api.patch<ChecklistItem>(`/tasks/${enc(taskId)}/checklist/${enc(itemId)}/`, payload)
  ).data
}

export async function deleteChecklistItem(taskId: string, itemId: string): Promise<void> {
  await api.delete(`/tasks/${enc(taskId)}/checklist/${enc(itemId)}/`)
}

export async function listComments(taskId: string, page = 1): Promise<Page<Comment>> {
  return (await api.get<Page<Comment>>(`/tasks/${enc(taskId)}/comments/`, { params: { page } }))
    .data
}

export async function createComment(
  taskId: string,
  content: string,
  mentions: string[] = [],
): Promise<Comment> {
  const payload: WriteCommentRequest = { content, mentions }
  return (await api.post<Comment>(`/tasks/${enc(taskId)}/comments/`, payload)).data
}

// ── Etiquetas, pessoas e histórico ─────────────────────────────────────────
export async function listLabels(sectorId: string, page = 1): Promise<Page<Label>> {
  return (await api.get<Page<Label>>(`/sectors/${enc(sectorId)}/labels/`, { params: { page } }))
    .data
}

export async function createLabel(sectorId: string, payload: CreateLabelRequest): Promise<Label> {
  return (await api.post<Label>(`/sectors/${enc(sectorId)}/labels/`, payload)).data
}

export async function deleteLabel(id: string): Promise<void> {
  await api.delete(`/labels/${enc(id)}/`)
}

export async function listSectorPeople(sectorId: string, page = 1): Promise<Page<Person>> {
  return (await api.get<Page<Person>>(`/sectors/${enc(sectorId)}/people/`, { params: { page } }))
    .data
}

export async function listTaskActivity(taskId: string, page = 1): Promise<Page<TaskActivity>> {
  return (
    await api.get<Page<TaskActivity>>(`/tasks/${enc(taskId)}/activity/`, { params: { page } })
  ).data
}

export async function deleteComment(taskId: string, commentId: string): Promise<void> {
  await api.delete(`/tasks/${enc(taskId)}/comments/${enc(commentId)}/`)
}

export async function updateComment(
  taskId: string,
  commentId: string,
  content: string,
): Promise<Comment> {
  return (
    await api.patch<Comment>(`/tasks/${enc(taskId)}/comments/${enc(commentId)}/`, { content })
  ).data
}

// ── Papéis e times do setor ────────────────────────────────────────────────
export async function updateSectorMemberRole(
  sectorId: string,
  memberId: number,
  role: SectorRole,
): Promise<SectorMember> {
  return (await api.patch<SectorMember>(`/sectors/${enc(sectorId)}/members/${memberId}/`, { role }))
    .data
}

export async function listSectorTeams(sectorId: string, page = 1): Promise<Page<SectorTeam>> {
  return (await api.get<Page<SectorTeam>>(`/sectors/${enc(sectorId)}/teams/`, { params: { page } }))
    .data
}

export async function addSectorTeam(
  sectorId: string,
  payload: AddSectorTeamRequest,
): Promise<SectorTeam> {
  return (await api.post<SectorTeam>(`/sectors/${enc(sectorId)}/teams/`, payload)).data
}

export async function removeSectorTeam(sectorId: string, linkId: number): Promise<void> {
  await api.delete(`/sectors/${enc(sectorId)}/teams/${linkId}/`)
}

// ── Links de apoio (tarefa, setor ou organização) ──────────────────────────
export type LinkTarget = 'task' | 'sector' | 'organization'

const LINK_PATH: Record<LinkTarget, (id: string) => string> = {
  task: (id) => `/tasks/${enc(id)}/links/`,
  sector: (id) => `/sectors/${enc(id)}/links/`,
  organization: (id) => `/organizations/${enc(id)}/links/`,
}

export async function listLinks(
  target: LinkTarget,
  id: string,
  page = 1,
): Promise<Page<ResourceLink>> {
  return (await api.get<Page<ResourceLink>>(LINK_PATH[target](id), { params: { page } })).data
}

export async function createLink(
  target: LinkTarget,
  id: string,
  payload: CreateResourceLinkRequest,
): Promise<ResourceLink> {
  return (await api.post<ResourceLink>(LINK_PATH[target](id), payload)).data
}

export async function deleteLink(linkId: string): Promise<void> {
  await api.delete(`/links/${enc(linkId)}/`)
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export async function getDashboard(organizationId: string): Promise<Dashboard> {
  return (await api.get<Dashboard>(`/organizations/${enc(organizationId)}/dashboard/`)).data
}

// ── Ciclos (sprints) ───────────────────────────────────────────────────────
export async function listCycles(sectorId: string, page = 1): Promise<Page<Cycle>> {
  return (await api.get<Page<Cycle>>(`/sectors/${enc(sectorId)}/cycles/`, { params: { page } }))
    .data
}

export async function createCycle(sectorId: string, payload: CreateCycleRequest): Promise<Cycle> {
  return (await api.post<Cycle>(`/sectors/${enc(sectorId)}/cycles/`, payload)).data
}

export async function updateCycle(id: string, payload: UpdateCycleRequest): Promise<Cycle> {
  return (await api.patch<Cycle>(`/cycles/${enc(id)}/`, payload)).data
}

export async function deleteCycle(id: string): Promise<void> {
  await api.delete(`/cycles/${enc(id)}/`)
}

// ── Relações entre tarefas (bloqueios) ─────────────────────────────────────
export async function getTaskRelations(taskId: string): Promise<TaskRelations> {
  return (await api.get<TaskRelations>(`/tasks/${enc(taskId)}/relations/`)).data
}

export async function addTaskRelation(
  taskId: string,
  kind: RelationKind,
  otherId: string,
): Promise<TaskRelations> {
  return (
    await api.post<TaskRelations>(`/tasks/${enc(taskId)}/relations/`, { kind, task: otherId })
  ).data
}

export async function removeTaskRelation(taskId: string, otherId: string): Promise<void> {
  await api.delete(`/tasks/${enc(taskId)}/relations/${enc(otherId)}/`)
}

// ── Lixeira, arquivo, seguir e burndown ────────────────────────────────────
export async function listTrash(sectorId: string, page = 1): Promise<Page<TrashedTask>> {
  return (
    await api.get<Page<TrashedTask>>(`/sectors/${enc(sectorId)}/trash/`, { params: { page } })
  ).data
}

export async function restoreTask(id: string): Promise<Task> {
  return (await api.post<Task>(`/tasks/${enc(id)}/restore/`)).data
}

export async function setTaskArchived(id: string, archived: boolean): Promise<Task> {
  const url = `/tasks/${enc(id)}/archive/`
  return (archived ? await api.put<Task>(url) : await api.delete<Task>(url)).data
}

export async function getFollow(taskId: string): Promise<FollowState> {
  return (await api.get<FollowState>(`/tasks/${enc(taskId)}/follow/`)).data
}

export async function setFollow(taskId: string, following: boolean): Promise<FollowState> {
  const url = `/tasks/${enc(taskId)}/follow/`
  return (following ? await api.put<FollowState>(url) : await api.delete<FollowState>(url)).data
}

export async function getBurndown(cycleId: string): Promise<Burndown> {
  return (await api.get<Burndown>(`/cycles/${enc(cycleId)}/burndown/`)).data
}

// ── Visões salvas, campos personalizados, modelos e edição em massa ─────────
export async function listSavedViews(sectorId: string): Promise<SavedView[]> {
  return (await api.get<SavedView[]>(`/sectors/${enc(sectorId)}/views/`)).data
}

export async function createSavedView(
  sectorId: string,
  payload: SaveViewRequest,
): Promise<SavedView> {
  return (await api.post<SavedView>(`/sectors/${enc(sectorId)}/views/`, payload)).data
}

export async function deleteSavedView(id: string): Promise<void> {
  await api.delete(`/views/${enc(id)}/`)
}

export async function listCustomFields(sectorId: string): Promise<CustomField[]> {
  return (await api.get<CustomField[]>(`/sectors/${enc(sectorId)}/fields/`)).data
}

export async function createCustomField(
  sectorId: string,
  payload: WriteCustomFieldRequest,
): Promise<CustomField> {
  return (await api.post<CustomField>(`/sectors/${enc(sectorId)}/fields/`, payload)).data
}

export async function updateCustomField(
  id: string,
  payload: Partial<WriteCustomFieldRequest>,
): Promise<CustomField> {
  return (await api.patch<CustomField>(`/fields/${enc(id)}/`, payload)).data
}

export async function deleteCustomField(id: string): Promise<void> {
  await api.delete(`/fields/${enc(id)}/`)
}

export async function listTaskFieldValues(taskId: string): Promise<TaskFieldValue[]> {
  return (await api.get<TaskFieldValue[]>(`/tasks/${enc(taskId)}/fields/`)).data
}

export async function setTaskFieldValue(
  taskId: string,
  fieldId: string,
  value: FieldValue,
): Promise<TaskFieldValue> {
  return (await api.put<TaskFieldValue>(`/tasks/${enc(taskId)}/fields/${enc(fieldId)}/`, { value }))
    .data
}

export async function listTemplates(sectorId: string): Promise<TaskTemplate[]> {
  return (await api.get<TaskTemplate[]>(`/sectors/${enc(sectorId)}/templates/`)).data
}

export async function createTemplate(
  sectorId: string,
  payload: WriteTemplateRequest,
): Promise<TaskTemplate> {
  return (await api.post<TaskTemplate>(`/sectors/${enc(sectorId)}/templates/`, payload)).data
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/templates/${enc(id)}/`)
}

export async function bulkEditTasks(sectorId: string, payload: BulkRequest): Promise<number> {
  return (await api.post<{ updated: number }>(`/sectors/${enc(sectorId)}/tasks/bulk/`, payload))
    .data.updated
}

<script setup lang="ts">
import { ArrowRight, FolderKanban, Plus, Search, Settings2, Star, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { useAuthStore } from '@/modules/auth'
import {
  TopbarComp,
  UiAvatar,
  UiButton,
  UiEmptyState,
  UiErrorState,
  UiIconButton,
  UiInput,
  UiProgress,
  UiSelect,
  UiSkeleton,
  UiTabs,
  type MenuItem,
} from '@/shared/components'
import { fetchAllPages } from '@/shared/utils'
import BoardColumn from '../components/boardColumn.vue'
import ProjectIcon from '../components/projectIcon.vue'
import TaskDetail from '../components/taskDetail.vue'
import TaskListView from '../components/taskListView.vue'
import TaskTableView from '../components/taskTableView.vue'
import { getSector, listLabels, listSectorPeople, setSectorFavorite } from '../services'
import { useKanbanStore, useSectorsStore } from '../stores'
import type { Label, Person, Sector, SectorRole, Task } from '../types'
import {
  NO_FILTERS,
  activeFilters,
  filterTasks,
  serverFilters,
  type BoardFilters,
} from '../utils/board'

type View = 'board' | 'list' | 'table'

const props = defineProps<{ sectorId: string }>()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const kanban = useKanbanStore()
const sidebar = useSectorsStore()

const sector = ref<(Sector & { my_role: SectorRole }) | null>(null)
const people = ref<Person[]>([])
const labels = ref<Label[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const filters = ref<BoardFilters>({ ...NO_FILTERS })
const panelOpen = ref(false)
const openTaskId = ref<string | null>(null)
const newStatus = ref('')
const tableVersion = ref(0)

const VIEWS = [
  { value: 'board', label: 'Quadro' },
  { value: 'list', label: 'Lista' },
  { value: 'table', label: 'Tabela' },
]
const view = computed<View>({
  get: () =>
    ['list', 'table'].includes(String(route.query.view)) ? (route.query.view as View) : 'board',
  set: (value) =>
    void router.replace({ query: { ...route.query, view: value === 'board' ? undefined : value } }),
})

const canEdit = computed(() => !!sector.value && sector.value.my_role !== 'viewer')
const canManage = computed(() => sector.value?.my_role === 'manager')
const topLevel = computed(() => kanban.tasks.filter((task) => !task.parent_id))
const visible = computed(() =>
  filterTasks(topLevel.value, filters.value, search.value, auth.user?.id ?? null),
)
const tasksOf = (statusId: string) =>
  visible.value.filter((t) => t.status_id === statusId).sort((a, b) => a.position - b.position)
const done = computed(() => topLevel.value.filter((t) => t.completed_at).length)
const filtering = computed(() => activeFilters(filters.value) > 0 || !!search.value.trim())
const tableFilters = computed(() =>
  serverFilters(filters.value, search.value, auth.user?.id ?? null),
)

const assigneeOptions = computed(() => [
  { value: '', label: 'Responsável: todos' },
  { value: 'me', label: 'Minhas tarefas' },
  { value: 'none', label: 'Sem responsável' },
  ...people.value.map((p) => ({ value: p.id, label: p.name || p.email })),
])
const PRIORITY_OPTIONS = [
  { value: '', label: 'Prioridade: todas' },
  { value: 'high+', label: 'Alta ou urgente' },
  { value: 'urgent', label: 'Urgente' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
]
const DUE_OPTIONS = [
  { value: '', label: 'Prazo: qualquer' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'today', label: 'Vence hoje' },
  { value: 'week', label: 'Próximos 7 dias' },
  { value: 'none', label: 'Sem prazo' },
]
const labelOptions = computed(() => [
  { value: '', label: 'Etiqueta: todas' },
  ...labels.value.map((label) => ({ value: label.id, label: label.name })),
])

async function load(id: string) {
  loading.value = true
  error.value = ''
  sector.value = null
  panelOpen.value = false
  filters.value = { ...NO_FILTERS }
  search.value = ''
  try {
    const [detail, peopleRows, labelRows] = await Promise.all([
      getSector(id),
      fetchAllPages((page) => listSectorPeople(id, page)),
      fetchAllPages((page) => listLabels(id, page)),
      kanban.load(id),
    ])
    if (id !== props.sectorId) return
    sector.value = detail
    people.value = peopleRows
    labels.value = labelRows
    // link direto (dashboard, calendário, notificações): /setores/:id?task=<id>
    const task = route.query.task
    if (typeof task === 'string' && kanban.tasks.some((t) => t.id === task)) openDetails(task)
  } catch (cause) {
    if (id === props.sectorId)
      error.value = getErrorMessage(cause, 'Confira se o projeto existe e se você tem acesso.')
  } finally {
    if (id === props.sectorId) loading.value = false
  }
}
watch(() => props.sectorId, load, { immediate: true })

watch(panelOpen, (open) => {
  if (open) return
  tableVersion.value++
  if (route.query.task) void router.replace({ query: { ...route.query, task: undefined } })
})

function openCreate(statusId = '') {
  openTaskId.value = null
  newStatus.value = statusId
  panelOpen.value = true
}

function openDetails(id: string) {
  openTaskId.value = id
  panelOpen.value = true
}

async function move(taskId: string, statusId: string, position?: number) {
  try {
    await kanban.move(taskId, statusId, position)
    tableVersion.value++
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível mover a tarefa.'))
  }
}

function moveItems(task: Task): MenuItem[] {
  const items: MenuItem[] = [
    { label: 'Abrir', icon: ArrowRight, onSelect: () => openDetails(task.id) },
  ]
  if (!canEdit.value) return items
  const others = kanban.statuses.filter((status) => status.id !== task.status_id)
  return [
    ...items,
    ...others.map((status, index) => ({
      label: `Mover para ${status.name}`,
      separatorBefore: index === 0,
      onSelect: () => void move(task.id, status.id),
    })),
  ]
}

async function toggleFavorite() {
  const current = sector.value
  if (!current) return
  const next = !current.is_favorite
  try {
    await setSectorFavorite(current.id, next)
    current.is_favorite = next
    toast.success(next ? 'Projeto fixado.' : 'Projeto desafixado.')
    void sidebar.load(current.organization_id).catch(() => undefined)
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível fixar o projeto.'))
  }
}

function clearFilters() {
  filters.value = { ...NO_FILTERS }
  search.value = ''
}
</script>

<template>
  <div class="flex h-[calc(100dvh-3.75rem)] min-h-0 w-full min-w-0 flex-col bg-bg md:h-dvh">
    <TopbarComp :crumbs="['Projetos', sector?.name ?? 'Projeto']" />

    <main class="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-6 pb-4 sm:px-8">
      <UiErrorState
        v-if="error"
        title="Não foi possível abrir este projeto"
        :description="error"
        @retry="load(sectorId)"
      />

      <template v-else>
        <header class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex min-w-0 items-start gap-3">
            <UiSkeleton v-if="!sector" class="size-10" />
            <ProjectIcon v-else :icon="sector.icon" :color="sector.color" size="lg" />
            <div class="min-w-0">
              <UiSkeleton v-if="!sector" class="mt-1 h-6 w-48" />
              <h1
                v-else
                class="truncate text-24 leading-tight font-semibold tracking-[-0.01em] text-fg"
              >
                {{ sector.name }}
              </h1>
              <p
                v-if="sector?.description"
                class="mt-1 line-clamp-2 max-w-2xl text-14 text-fg-muted"
              >
                {{ sector.description }}
              </p>
              <div v-if="sector && topLevel.length" class="mt-2 flex w-64 items-center gap-2">
                <UiProgress
                  :value="done"
                  :max="topLevel.length"
                  tone="neutral"
                  label="Progresso do projeto"
                />
                <span class="shrink-0 text-12 text-fg-muted tabular-nums">
                  {{ done }} de {{ topLevel.length }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="sector" class="flex items-center gap-2">
            <span
              class="mr-1 hidden items-center sm:flex"
              :title="people.map((p) => p.name).join(', ')"
            >
              <UiAvatar
                v-for="person in people.slice(0, 4)"
                :key="person.id"
                :name="person.name || person.email"
                size="sm"
                class="-ml-1.5 ring-2 ring-bg first:ml-0"
              />
              <span v-if="people.length > 4" class="ml-1.5 text-12 text-fg-muted"
                >+{{ people.length - 4 }}</span
              >
              <span class="sr-only">{{ people.length }} pessoas com acesso</span>
            </span>
            <UiIconButton
              :icon="Star"
              :label="sector.is_favorite ? 'Desafixar projeto' : 'Fixar projeto'"
              :pressed="!!sector.is_favorite"
              :class="
                sector.is_favorite
                  ? 'aria-pressed:bg-transparent! aria-pressed:text-fg! [&_svg]:fill-current'
                  : ''
              "
              @click="toggleFavorite"
            />
            <UiIconButton
              v-if="canManage"
              :icon="Settings2"
              label="Colunas e configurações do projeto"
              @click="router.push({ name: 'SectorEdit', params: { id: sector.id } })"
            />
            <UiButton v-if="canEdit" variant="primary" :icon="Plus" @click="openCreate()">
              Nova tarefa
            </UiButton>
          </div>
        </header>

        <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
          <UiTabs v-model="view" :tabs="VIEWS" label="Modo de visualização" />
          <div
            class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:min-w-0 sm:flex-1 sm:flex-wrap sm:items-center sm:justify-end"
            role="group"
            aria-label="Filtrar tarefas"
          >
            <UiInput
              v-model="search"
              type="search"
              :icon="Search"
              placeholder="Buscar tarefas"
              aria-label="Buscar tarefas"
              class="col-span-2 sm:w-56"
            />
            <UiSelect
              v-model="filters.assignee"
              aria-label="Responsável"
              :options="assigneeOptions"
              class="sm:w-44"
            />
            <UiSelect
              v-model="filters.priority"
              aria-label="Prioridade"
              :options="PRIORITY_OPTIONS"
              class="sm:w-40"
            />
            <UiSelect
              v-model="filters.due"
              aria-label="Prazo"
              :options="DUE_OPTIONS"
              class="sm:w-40"
            />
            <UiSelect
              v-if="labels.length"
              v-model="filters.label"
              aria-label="Etiqueta"
              :options="labelOptions"
              class="sm:w-40"
            />
            <UiButton v-if="filtering" variant="ghost" :icon="X" @click="clearFilters"
              >Limpar</UiButton
            >
          </div>
        </div>
        <p v-if="filtering && view !== 'table'" class="-mt-2 text-12 text-fg-muted" role="status">
          Mostrando {{ visible.length }} de {{ topLevel.length }} tarefas
        </p>

        <div v-if="loading" class="flex gap-3 overflow-hidden" aria-label="Carregando o quadro">
          <div v-for="n in 3" :key="n" class="grid w-72 shrink-0 content-start gap-2">
            <UiSkeleton class="h-6 w-32" />
            <UiSkeleton v-for="m in 3" :key="m" class="h-24 rounded-card" />
          </div>
        </div>

        <UiEmptyState
          v-else-if="!kanban.statuses.length"
          :icon="FolderKanban"
          title="Este projeto ainda não tem colunas"
          :description="
            canManage
              ? 'Crie as colunas do fluxo para começar.'
              : 'Peça a um gestor do projeto para criar as colunas.'
          "
        >
          <template v-if="canManage && sector" #action>
            <UiButton @click="router.push({ name: 'SectorEdit', params: { id: sector.id } })">
              Criar colunas
            </UiButton>
          </template>
        </UiEmptyState>

        <div
          v-else-if="view === 'board'"
          class="-mx-4 flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8"
        >
          <BoardColumn
            v-for="status in kanban.statuses"
            :key="status.id"
            :status="status"
            :tasks="tasksOf(status.id)"
            :can-edit="canEdit"
            :move-items="moveItems"
            @add="openCreate(status.id)"
            @open="openDetails"
            @drop="(taskId, position) => move(taskId, status.id, position)"
          />
        </div>

        <div v-else-if="view === 'list'" class="min-h-0 flex-1 overflow-y-auto pb-4">
          <TaskListView :statuses="kanban.statuses" :tasks-of="tasksOf" @open="openDetails" />
        </div>

        <div v-else class="min-h-0 flex-1 overflow-y-auto pb-4">
          <TaskTableView
            :sector-id="sectorId"
            :statuses="kanban.statuses"
            :filters="tableFilters"
            :version="tableVersion"
            @open="openDetails"
          />
        </div>
      </template>
    </main>

    <TaskDetail
      v-if="sector"
      v-model:open="panelOpen"
      v-model:task-id="openTaskId"
      :sector-id="sector.id"
      :sector-name="sector.name"
      :people="people"
      :labels="labels"
      :initial-status="newStatus"
      :can-edit="canEdit"
      :can-manage="canManage"
      @label-created="labels = [...labels, $event].sort((a, b) => a.name.localeCompare(b.name))"
    />
  </div>
</template>

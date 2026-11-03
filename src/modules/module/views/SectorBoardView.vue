<script lang="ts">
import type { Label, Person, Sector, SectorRole } from '../types'

// último estado visto de cada projeto, fora da instância (sobrevive a sair e voltar):
// reabrir um projeto mostra na hora o que já havia e atualiza por trás, sem trocar o quadro
// por esqueletos. As colunas e tarefas ficam no kanban store.
type Snapshot = { sector: Sector & { my_role: SectorRole }; people: Person[]; labels: Label[] }
const snapshots = new Map<string, Snapshot>()
</script>

<script setup lang="ts">
import {
  ArrowRight,
  CalendarDays,
  FolderKanban,
  GitBranch,
  LayoutList,
  ListFilter,
  Plus,
  Search,
  Settings2,
  Share2,
  SquareKanban,
  Star,
  Table2,
  Video,
  X,
  type LucideIcon,
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { useAuthStore } from '@/modules/auth'
import { ProjectGitHub } from '@/modules/github'
import { ProjectMeetings } from '@/modules/meetings'
import {
  TopbarComp,
  UiAvatar,
  UiButton,
  UiEmptyState,
  UiErrorState,
  UiInput,
  UiSelect,
  UiSkeleton,
  UiTooltip,
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
import type { Task } from '../types'
import {
  NO_FILTERS,
  activeFilters,
  filterTasks,
  serverFilters,
  type BoardFilters,
} from '../utils/board'

type View = 'board' | 'list' | 'table' | 'meetings' | 'github'
// abas que não mostram tarefas (sem filtros)
const TASKLESS: View[] = ['meetings', 'github']

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
  { value: 'meetings', label: 'Reuniões' },
  { value: 'github', label: 'GitHub' },
]
const VIEW_ICONS: Record<View, LucideIcon> = {
  board: SquareKanban,
  list: LayoutList,
  table: Table2,
  meetings: Video,
  github: GitBranch,
}
const filtersOpen = ref(false)

async function share() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.success('Link do projeto copiado.')
  } catch {
    toast.error('Não foi possível copiar o link.')
  }
}
const view = computed<View>({
  get: () =>
    ['list', 'table', 'meetings', 'github'].includes(String(route.query.view))
      ? (route.query.view as View)
      : 'board',
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
const percent = computed(() =>
  topLevel.value.length ? Math.round((done.value * 100) / topLevel.value.length) : 0,
)
// etiquetas viram filtros rápidos, com a contagem de tarefas de cada uma
const labelChips = computed(() =>
  labels.value
    .map((label) => ({
      ...label,
      count: topLevel.value.filter((t) => t.labels.some((l) => l.id === label.id)).length,
    }))
    .filter((label) => label.count),
)
const configure = () =>
  sector.value && void router.push({ name: 'SectorEdit', params: { id: sector.value.id } })
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
  const cached = snapshots.get(id)
  const warm = !!cached && kanban.sectorId === id && kanban.statuses.length > 0
  loading.value = !warm
  error.value = ''
  sector.value = cached?.sector ?? null
  people.value = cached?.people ?? []
  labels.value = cached?.labels ?? []
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
    snapshots.set(id, { sector: detail, people: peopleRows, labels: labelRows })
    // link direto (dashboard, calendário, notificações): /setores/:id?task=<id>
    const task = route.query.task
    if (typeof task === 'string' && kanban.tasks.some((t) => t.id === task)) openDetails(task)
  } catch (cause) {
    if (id !== props.sectorId) return
    snapshots.delete(id)
    sector.value = null
    error.value = getErrorMessage(cause, 'Confira se o projeto existe e se você tem acesso.')
  } finally {
    if (id === props.sectorId) loading.value = false
  }
}
watch(() => props.sectorId, load, { immediate: true })
// a busca global pode abrir outra tarefa do projeto já carregado
watch(
  () => route.query.task,
  (task) => {
    if (loading.value || typeof task !== 'string') return
    if (kanban.tasks.some((t) => t.id === task)) openDetails(task)
  },
)

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

    <main class="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 sm:px-8">
      <UiErrorState
        v-if="error"
        title="Não foi possível abrir este projeto"
        :description="error"
        @retry="load(sectorId)"
      />

      <template v-else>
        <section class="board-stage">
          <img
            class="board-stage-media"
            src="/images/office-workstation.webp"
            srcset="/images/office-workstation-sm.webp 960w, /images/office-workstation.webp 1920w"
            sizes="100vw"
            alt=""
            decoding="async"
          />
          <header class="ui-rise flex flex-wrap items-start justify-between gap-4">
            <div class="flex min-w-0 flex-1 basis-64 items-center gap-4">
              <UiSkeleton v-if="!sector" class="size-12 rounded-[12px]" />
              <span
                v-else
                class="board-tile"
                :style="{ '--project': sector.color || '#f99f11' }"
                aria-hidden="true"
              >
                <ProjectIcon :icon="sector.icon" color="#ffffff" size="lg" />
              </span>
              <div class="min-w-0 flex-1">
                <UiSkeleton v-if="!sector" class="mt-1 h-7 w-56" />
                <h1
                  v-else
                  class="truncate text-24 leading-tight font-semibold tracking-[-0.015em] text-white"
                >
                  {{ sector.name }}
                </h1>
                <p
                  v-if="sector"
                  class="mt-0.5 line-clamp-1 max-w-2xl text-13 text-white/65 sm:text-14"
                >
                  {{ sector.description || `${done} de ${topLevel.length} tarefas concluídas` }}
                </p>
              </div>
            </div>
            <div v-if="sector" class="flex flex-wrap items-center gap-2">
              <span
                class="mr-1 hidden items-center sm:flex"
                :title="people.map((p) => p.name).join(', ')"
              >
                <UiAvatar
                  v-for="person in people.slice(0, 4)"
                  :key="person.id"
                  :name="person.name || person.email"
                  size="sm"
                  class="-ml-1.5 ring-2 ring-black first:ml-0"
                />
                <span v-if="people.length > 4" class="ml-1.5 text-12 text-white/70"
                  >+{{ people.length - 4 }}</span
                >
                <span class="sr-only">{{ people.length }} pessoas com acesso</span>
              </span>
              <button type="button" class="board-glass" @click="share">
                <Share2 :size="15" aria-hidden="true" />
                <span class="hidden sm:inline">Compartilhar</span>
                <span class="sr-only sm:hidden">Copiar link do projeto</span>
              </button>
              <button
                v-if="!TASKLESS.includes(view)"
                type="button"
                class="board-glass board-glass-icon"
                :aria-pressed="filtersOpen"
                :aria-label="filtersOpen ? 'Esconder filtros' : 'Mostrar filtros'"
                @click="filtersOpen = !filtersOpen"
              >
                <ListFilter :size="16" aria-hidden="true" />
                <span v-if="activeFilters(filters) > 0" class="board-glass-dot" />
              </button>
              <button
                type="button"
                class="board-glass board-glass-icon"
                :aria-pressed="!!sector.is_favorite"
                :aria-label="sector.is_favorite ? 'Desafixar projeto' : 'Fixar projeto'"
                @click="toggleFavorite"
              >
                <Star
                  :size="16"
                  :class="sector.is_favorite ? 'fill-[#f99f11] text-[#f99f11]' : ''"
                  aria-hidden="true"
                />
              </button>
              <button
                v-if="canManage"
                type="button"
                class="board-glass board-glass-icon"
                aria-label="Colunas e configurações do projeto"
                @click="configure"
              >
                <Settings2 :size="16" aria-hidden="true" />
              </button>
              <UiButton v-if="canEdit" variant="primary" :icon="Plus" @click="openCreate()">
                Nova tarefa
              </UiButton>
            </div>
          </header>

          <div
            v-if="sector && topLevel.length"
            class="ui-rise mt-4 flex max-w-sm items-center gap-3"
          >
            <span
              class="uo-meter flex-1"
              role="progressbar"
              aria-label="Progresso do projeto"
              aria-valuemin="0"
              :aria-valuemax="topLevel.length"
              :aria-valuenow="done"
            >
              <span :style="{ width: `${percent}%` }" />
            </span>
            <span class="shrink-0 text-12 text-white/65 tabular-nums">
              <span class="font-mono text-white">{{ percent }}%</span> concluído
            </span>
          </div>

          <!-- etiquetas como abas (Todos, Design, Back-end…) e o modo de visualização -->
          <div class="mt-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div
              v-if="!TASKLESS.includes(view)"
              class="board-cats"
              role="group"
              aria-label="Filtrar por etiqueta"
            >
              <button
                type="button"
                class="board-cat"
                :aria-pressed="!filters.label"
                @click="filters.label = ''"
              >
                Todos <span class="board-cat-count">{{ topLevel.length }}</span>
              </button>
              <button
                v-for="label in labelChips"
                :key="label.id"
                type="button"
                class="board-cat"
                :style="{ '--cat': label.color || '#f99f11' }"
                :aria-pressed="filters.label === label.id"
                @click="filters.label = filters.label === label.id ? '' : label.id"
              >
                {{ label.name }} <span class="board-cat-count">{{ label.count }}</span>
              </button>
            </div>
            <span v-else />
            <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
              <UiInput
                v-if="!TASKLESS.includes(view)"
                v-model="search"
                type="search"
                :icon="Search"
                placeholder="Buscar tarefas"
                aria-label="Buscar tarefas"
                class="board-search w-full sm:w-56"
              />
              <div class="board-views" role="tablist" aria-label="Modo de visualização">
                <UiTooltip
                  v-for="item in VIEWS"
                  :key="item.value"
                  :text="item.label"
                  placement="bottom"
                  :delay="250"
                >
                  <button
                    type="button"
                    role="tab"
                    class="board-view"
                    :aria-selected="view === item.value"
                    :aria-label="item.label"
                    @click="view = item.value as View"
                  >
                    <component :is="VIEW_ICONS[item.value as View]" :size="16" aria-hidden="true" />
                    <span class="board-view-label">{{ item.label }}</span>
                  </button>
                </UiTooltip>
                <UiTooltip text="Calendário da organização" placement="bottom" :delay="250">
                  <RouterLink to="/calendario" class="board-view" aria-label="Calendário">
                    <CalendarDays :size="16" aria-hidden="true" />
                  </RouterLink>
                </UiTooltip>
              </div>
            </div>
          </div>
        </section>

        <div
          v-if="!TASKLESS.includes(view) && (filtersOpen || activeFilters(filters) > 0)"
          class="board-filters ui-rise"
          role="group"
          aria-label="Filtrar tarefas"
        >
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
        <p
          v-if="filtering && view !== 'table' && !TASKLESS.includes(view)"
          class="-mt-2 text-12 text-fg-muted"
          role="status"
        >
          Mostrando {{ visible.length }} de {{ topLevel.length }} tarefas
        </p>

        <div
          v-if="view === 'meetings' && sector"
          class="ui-rise -mx-4 min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:-mx-8 sm:px-8"
        >
          <ProjectMeetings :sector-id="sector.id" :can-edit="canEdit" :people="people" />
        </div>

        <div
          v-else-if="view === 'github' && sector"
          class="ui-rise -mx-4 min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:-mx-8 sm:px-8"
        >
          <ProjectGitHub :sector-id="sector.id" :can-manage="canManage" />
        </div>

        <div
          v-else-if="loading"
          class="flex gap-3 overflow-hidden"
          aria-label="Carregando o quadro"
        >
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
            <UiButton @click="configure"> Criar colunas </UiButton>
          </template>
        </UiEmptyState>

        <div
          v-else-if="view === 'board'"
          class="board-lanes ui-rise -mx-4 flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8"
        >
          <BoardColumn
            v-for="status in kanban.statuses"
            :key="status.id"
            :status="status"
            :tasks="tasksOf(status.id)"
            :can-edit="canEdit"
            :can-manage="canManage"
            :move-items="moveItems"
            @configure="configure"
            @add="openCreate(status.id)"
            @open="openDetails"
            @drop="(taskId, position) => move(taskId, status.id, position)"
          />
        </div>

        <div v-else-if="view === 'list'" class="ui-rise min-h-0 flex-1 overflow-y-auto pb-4">
          <TaskListView :statuses="kanban.statuses" :tasks-of="tasksOf" @open="openDetails" />
        </div>

        <div v-else class="ui-rise min-h-0 flex-1 overflow-y-auto pb-4">
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

<style>
/* a foto do escritório ocupa o topo do quadro, por trás do cabeçalho, e some no fundo */
.board-stage {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  margin-inline: -16px;
  padding: 24px 16px 0;
  color: #ffffff;
}

@media (width >= 40rem) {
  .board-stage {
    margin-inline: -32px;
    padding: 28px 32px 0;
  }
}

.board-stage-media {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 55%;
  animation: uo-hero-settle 1.4s var(--ease-out) both;
}

.board-stage::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  content: '';
  background:
    radial-gradient(50% 90% at 90% 0%, rgb(249 159 17 / 0.18), transparent 60%),
    linear-gradient(90deg, rgb(0 0 0 / 0.88) 0%, rgb(0 0 0 / 0.6) 50%, rgb(0 0 0 / 0.35) 100%),
    linear-gradient(180deg, transparent 40%, var(--ds-bg) 100%);
}

.board-tile {
  display: grid;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--project), #fff 15%), var(--project));
  box-shadow: 0 10px 28px -10px var(--project);
}

.board-tile > span {
  border: 0;
  background: transparent;
}

/* botões de vidro sobre a foto */
.board-glass {
  position: relative;
  display: inline-flex;
  height: 36px;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 10px;
  background: rgb(0 0 0 / 0.35);
  padding-inline: 12px;
  font-size: var(--text-13);
  color: rgb(255 255 255 / 0.9);
  backdrop-filter: blur(10px);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.board-glass:hover {
  border-color: rgb(255 255 255 / 0.28);
  background: rgb(255 255 255 / 0.1);
}

.board-glass:active {
  transform: scale(0.96);
}

.board-glass:focus-visible,
.board-cat:focus-visible,
.board-view:focus-visible {
  outline: 2px solid #f99f11;
  outline-offset: 2px;
}

.board-glass[aria-pressed='true'] {
  border-color: rgb(249 159 17 / 0.5);
  background: rgb(249 159 17 / 0.14);
}

.board-glass-icon {
  width: 36px;
  justify-content: center;
  padding: 0;
}

.board-glass-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #f99f11;
}

/* etiquetas como abas sublinhadas */
.board-cats {
  display: flex;
  max-width: 100%;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.board-cat {
  --cat: #f99f11;
  position: relative;
  display: inline-flex;
  height: 38px;
  flex-shrink: 0;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  padding-inline: 12px;
  font-size: var(--text-13);
  color: rgb(255 255 255 / 0.62);
  transition: color var(--dur-fast) var(--ease-out);
}

.board-cat::after {
  position: absolute;
  right: 8px;
  bottom: 0;
  left: 8px;
  height: 2px;
  border-radius: 2px;
  content: '';
  background: var(--cat);
  box-shadow: 0 0 10px var(--cat);
  transform: scaleX(0);
  transition: transform var(--dur-base) var(--ease-out);
}

.board-cat:hover {
  color: #ffffff;
}

.board-cat[aria-pressed='true'] {
  color: #ffffff;
}

.board-cat[aria-pressed='true']::after {
  transform: scaleX(1);
}

.board-cat-count {
  border-radius: 6px;
  background: rgb(255 255 255 / 0.1);
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: var(--text-12);
}

.board-cat[aria-pressed='true'] .board-cat-count {
  background: color-mix(in srgb, var(--cat) 25%, transparent);
  color: color-mix(in srgb, var(--cat), #fff 40%);
}

.board-views {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  border: 1px solid rgb(255 255 255 / 0.12);
  border-radius: 10px;
  background: rgb(0 0 0 / 0.4);
  padding: 3px;
  backdrop-filter: blur(10px);
}

.board-view {
  display: inline-flex;
  height: 30px;
  min-width: 30px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 7px;
  padding-inline: 8px;
  font-size: var(--text-13);
  color: rgb(255 255 255 / 0.62);
  transition:
    color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}

.board-view:hover {
  color: #ffffff;
}

.board-view[aria-selected='true'] {
  background: rgb(249 159 17 / 0.16);
  color: #f99f11;
}

.board-view-label {
  display: none;
}

@media (width >= 96rem) {
  .board-view-label {
    display: inline;
  }
}

.board-search input {
  background: rgb(0 0 0 / 0.4);
}

.board-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

@media (width >= 40rem) {
  .board-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }
}

/* colunas encaixam ao rolar no celular */
@media (width < 40rem) {
  .board-lanes {
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 16px;
  }

  .board-lanes > * {
    scroll-snap-align: start;
  }
}
</style>

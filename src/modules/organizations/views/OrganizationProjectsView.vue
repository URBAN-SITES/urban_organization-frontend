<script setup lang="ts">
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
} from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import {
  ProjectIcon,
  deleteSector,
  listSectors,
  projectPercent,
  setSectorArchived,
  setSectorFavorite,
  useSectorsStore,
  type Sector,
  type SectorListParams,
} from '@/modules/module'
import {
  UiBadge,
  UiButton,
  UiEmptyState,
  UiErrorState,
  UiIconButton,
  UiInput,
  UiMenu,
  UiProgress,
  UiSelect,
  UiSkeleton,
  UiTabs,
  type MenuItem,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import type { Page } from '@/shared/types'
import OrganizationLayout from '../components/organizationLayout.vue'
import ProjectAccessDrawer from '../components/projectAccessDrawer.vue'
import ProjectFormDialog from '../components/projectFormDialog.vue'
import { useOrganizationAdmin } from '../composables/useOrganizationAdmin'

type Tab = 'active' | 'favorites' | 'archived'
type Ordering = NonNullable<SectorListParams['ordering']>

const {
  id,
  organization,
  load: loadOrganization,
  error: organizationError,
} = useOrganizationAdmin()
const router = useRouter()
const confirm = useConfirm()
const sidebar = useSectorsStore()
const tab = ref<Tab>('active')
const search = ref('')
const query = ref('')
const ordering = ref<Ordering>('name')
const page = ref(1)
const result = ref<Page<Sector> | null>(null)
const loading = ref(true)
const error = ref('')
const pending = ref('')
const formOpen = ref(false)
const accessOpen = ref(false)
const editing = ref<Sector | null>(null)
let version = 0

const TABS = [
  { value: 'active', label: 'Ativos' },
  { value: 'favorites', label: 'Fixados' },
  { value: 'archived', label: 'Arquivados' },
]
const ORDERINGS = [
  { value: 'name', label: 'Nome (A–Z)' },
  { value: '-name', label: 'Nome (Z–A)' },
  { value: '-created_at', label: 'Mais recentes' },
  { value: 'created_at', label: 'Mais antigos' },
]
const canCreate = computed(
  () => !!organization.value && organization.value.current_role !== 'viewer',
)
const percent = (project: Sector) => projectPercent(project.task_done, project.task_total)

async function loadProjects() {
  const request = ++version
  loading.value = true
  error.value = ''
  try {
    const page_ = await listSectors(id.value, page.value, {
      archived: tab.value === 'archived',
      favorite: tab.value === 'favorites',
      ordering: ordering.value,
      ...(query.value ? { search: query.value } : {}),
    })
    if (request === version) result.value = page_
  } catch (cause) {
    if (request === version) error.value = getErrorMessage(cause, 'Tente novamente.')
  } finally {
    if (request === version) loading.value = false
  }
}

async function initialize() {
  result.value = null
  page.value = 1
  await loadOrganization()
  if (organization.value) await loadProjects()
  else loading.value = false
}

// a busca vai ao servidor depois de uma pausa na digitação
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => (query.value = value.trim()), 300)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  version++
})
watch([tab, ordering, query], () => {
  page.value = 1
  void loadProjects()
})
watch(id, initialize, { immediate: true })

function changePage(offset: number) {
  page.value += offset
  void loadProjects()
}

/** Atualiza a lista e a barra lateral (que mostra os fixados primeiro). */
async function refresh() {
  await Promise.all([loadProjects(), sidebar.load(id.value).catch(() => undefined)])
}

async function act(project: Sector, action: () => Promise<unknown>, success: string) {
  if (pending.value) return
  pending.value = project.id
  try {
    await action()
    toast.success(success)
    await refresh()
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível concluir a ação.'))
  } finally {
    pending.value = ''
  }
}

function toggleFavorite(project: Sector) {
  const next = !project.is_favorite
  void act(
    project,
    () => setSectorFavorite(project.id, next),
    next ? 'Projeto fixado.' : 'Projeto desafixado.',
  )
}

async function toggleArchive(project: Sector) {
  const archiving = !project.archived_at
  if (
    archiving &&
    !(await confirm({
      title: `Arquivar “${project.name}”?`,
      description:
        'O projeto sai das listas e da barra lateral, mas as tarefas ficam guardadas. Você pode restaurá-lo em Arquivados.',
      confirmLabel: 'Arquivar',
    }))
  )
    return
  void act(
    project,
    () => setSectorArchived(project.id, archiving),
    archiving ? 'Projeto arquivado.' : 'Projeto restaurado.',
  )
}

async function remove(project: Sector) {
  const confirmed = await confirm({
    title: `Excluir “${project.name}”?`,
    description:
      'O projeto e suas tarefas deixam de aparecer para todos. A restauração ainda não está disponível pela interface; para só tirar da frente, prefira arquivar.',
    confirmLabel: 'Excluir projeto',
    danger: true,
  })
  if (confirmed) void act(project, () => deleteSector(project.id), 'Projeto excluído.')
}

function openForm(project: Sector | null) {
  editing.value = project
  formOpen.value = true
}

function openAccess(project: Sector) {
  editing.value = project
  accessOpen.value = true
}

function onSaved(project: Sector) {
  toast.success(editing.value ? 'Projeto atualizado.' : 'Projeto criado.')
  if (!editing.value) void router.push(`/setores/${project.id}`)
  else void refresh()
}

function menuFor(project: Sector): MenuItem[] {
  const items: MenuItem[] = [
    {
      label: 'Abrir quadro',
      icon: FolderKanban,
      onSelect: () => router.push(`/setores/${project.id}`),
    },
  ]
  if (!project.can_manage) return items
  return [
    ...items,
    { label: 'Editar', icon: Pencil, onSelect: () => openForm(project) },
    { label: 'Pessoas e times', icon: ShieldCheck, onSelect: () => openAccess(project) },
    {
      label: project.archived_at ? 'Restaurar' : 'Arquivar',
      icon: project.archived_at ? ArchiveRestore : Archive,
      separatorBefore: true,
      onSelect: () => toggleArchive(project),
    },
    { label: 'Excluir', icon: Trash2, danger: true, onSelect: () => remove(project) },
  ]
}

const emptyTitle = computed(() => {
  if (query.value) return `Nenhum projeto encontrado para “${query.value}”`
  if (tab.value === 'favorites') return 'Nenhum projeto fixado'
  if (tab.value === 'archived') return 'Nenhum projeto arquivado'
  return 'Nenhum projeto ainda'
})
const emptyDescription = computed(() => {
  if (query.value) return 'Confira a grafia ou busque por outra palavra.'
  if (tab.value === 'favorites')
    return 'Fixe os projetos que você mais usa: eles aparecem primeiro na barra lateral.'
  if (tab.value === 'archived') return 'Projetos arquivados ficam aqui, prontos para restaurar.'
  return canCreate.value
    ? 'Crie um projeto para organizar as tarefas do time em um quadro.'
    : 'Quando alguém compartilhar um projeto com você, ele aparece aqui.'
})
</script>

<template>
  <OrganizationLayout
    title="Projetos"
    :description="organization ? `Quadros de trabalho de ${organization.name}.` : undefined"
    :organization-id="organization?.id"
  >
    <template v-if="canCreate" #actions>
      <UiButton variant="primary" :icon="Plus" @click="openForm(null)">Novo projeto</UiButton>
    </template>

    <UiErrorState
      v-if="!organization && organizationError"
      title="Não foi possível abrir esta organização"
      :description="organizationError"
      @retry="initialize"
    />

    <template v-else>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <UiTabs v-model="tab" :tabs="TABS" label="Filtrar projetos" class="min-w-0" />
        <div class="flex w-full flex-wrap gap-2 sm:w-auto">
          <UiInput
            v-model="search"
            type="search"
            :icon="Search"
            placeholder="Buscar projetos"
            aria-label="Buscar projetos"
            class="min-w-0 flex-1 sm:w-64"
          />
          <UiSelect
            v-model="ordering"
            aria-label="Ordenar projetos"
            :options="ORDERINGS"
            class="w-40"
          />
        </div>
      </div>

      <ul
        v-if="loading && !result"
        class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Carregando"
      >
        <li v-for="n in 6" :key="n"><UiSkeleton class="h-40 rounded-card" /></li>
      </ul>

      <UiErrorState
        v-else-if="error"
        title="Não foi possível carregar os projetos"
        :description="error"
        @retry="loadProjects"
      />

      <div
        v-else-if="!result?.results.length"
        class="rounded-card border border-dashed border-border"
      >
        <UiEmptyState :icon="FolderKanban" :title="emptyTitle" :description="emptyDescription">
          <template v-if="query || (tab === 'active' && canCreate)" #action>
            <UiButton v-if="query" @click="search = ''">Limpar busca</UiButton>
            <UiButton v-else variant="primary" :icon="Plus" @click="openForm(null)">
              Novo projeto
            </UiButton>
          </template>
        </UiEmptyState>
      </div>

      <template v-else>
        <ul
          :class="[
            'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
            loading ? 'opacity-60 transition-opacity duration-(--dur-fast)' : '',
          ]"
          :aria-busy="loading"
        >
          <li
            v-for="project in result.results"
            :key="project.id"
            class="relative flex flex-col gap-4 rounded-card border border-border bg-surface-1 p-4 transition-colors duration-(--dur-fast) ease-out focus-within:border-border-strong hover:border-border-strong"
          >
            <div class="flex items-start gap-3">
              <ProjectIcon :icon="project.icon" :color="project.color" />
              <div class="min-w-0 flex-1">
                <h2 class="truncate text-14 font-semibold text-fg">
                  <RouterLink
                    :to="`/setores/${project.id}`"
                    class="rounded-[4px] after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {{ project.name }}
                  </RouterLink>
                </h2>
                <p class="flex items-center gap-1 text-12 text-fg-muted">
                  <Lock v-if="project.is_private" :size="12" aria-hidden="true" />
                  {{ project.is_private ? 'Privado' : 'Visível para a organização' }}
                </p>
              </div>
              <span class="relative z-10 flex items-center gap-0.5">
                <UiIconButton
                  :icon="Star"
                  :label="
                    project.is_favorite ? `Desafixar ${project.name}` : `Fixar ${project.name}`
                  "
                  :pressed="!!project.is_favorite"
                  :loading="pending === project.id"
                  :disabled="!!pending"
                  :class="
                    project.is_favorite
                      ? 'aria-pressed:bg-transparent! aria-pressed:text-fg! [&_svg]:fill-current'
                      : ''
                  "
                  @click="toggleFavorite(project)"
                />
                <UiMenu
                  :items="menuFor(project)"
                  :label="`Ações de ${project.name}`"
                  placement="bottom-end"
                >
                  <template #trigger="{ props: trigger }">
                    <UiIconButton
                      v-bind="trigger"
                      :icon="MoreHorizontal"
                      :label="`Ações de ${project.name}`"
                    />
                  </template>
                </UiMenu>
              </span>
            </div>
            <p v-if="project.description" class="line-clamp-2 text-13 text-fg-muted">
              {{ project.description }}
            </p>
            <div class="mt-auto grid gap-1.5">
              <div class="flex items-center justify-between text-12 text-fg-muted">
                <span v-if="percent(project) === null">Sem tarefas ainda</span>
                <span v-else
                  >{{ project.task_done }} de {{ project.task_total }} tarefas concluídas</span
                >
                <UiBadge v-if="project.archived_at">Arquivado</UiBadge>
                <span v-else-if="percent(project) !== null" class="font-mono tabular-nums">
                  {{ percent(project) }}%
                </span>
              </div>
              <UiProgress
                :value="percent(project) ?? 0"
                tone="neutral"
                :label="`Progresso de ${project.name}`"
              />
            </div>
          </li>
        </ul>

        <footer
          v-if="result.next || result.previous"
          class="flex items-center justify-between gap-2 text-13 text-fg-muted"
        >
          <span>Página {{ page }} · {{ result.count }} projetos</span>
          <span class="flex gap-1">
            <UiIconButton
              :icon="ChevronLeft"
              label="Página anterior"
              :disabled="!result.previous || loading"
              @click="changePage(-1)"
            />
            <UiIconButton
              :icon="ChevronRight"
              label="Próxima página"
              :disabled="!result.next || loading"
              @click="changePage(1)"
            />
          </span>
        </footer>
      </template>
    </template>

    <ProjectFormDialog
      v-model:open="formOpen"
      :organization-id="id"
      :project="editing"
      @saved="onSaved"
    />
    <ProjectAccessDrawer v-model:open="accessOpen" :organization-id="id" :project="editing" />
  </OrganizationLayout>
</template>

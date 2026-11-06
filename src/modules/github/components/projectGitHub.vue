<script setup lang="ts">
import {
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Lock,
  MessageSquare,
  Plus,
  Unlink,
  type LucideIcon,
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
  UiBadge,
  UiButton,
  UiEmptyState,
  UiErrorState,
  UiPanel,
  UiSelect,
  UiSkeleton,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import type { UUID } from '@/shared/types'
import { relativeTime } from '@/shared/utils/time'
import {
  getRepositoryActivity,
  listProjectRepositories,
  unlinkProjectRepository,
} from '../services'
import type { CheckState, ProjectRepository, RepositoryActivity } from '../types'
import { CHECK_LABELS, PULL_STATES } from '../utils'
import ImportGitHubProject from './importGitHubProject.vue'
import LinkRepositoriesDialog from './linkRepositoriesDialog.vue'

/** Aba GitHub do projeto: repositórios associados e o que está acontecendo em cada um. */
const props = defineProps<{ sectorId: UUID; canManage: boolean }>()
defineEmits<{ imported: [] }>()
const confirm = useConfirm()

const repositories = ref<ProjectRepository[]>([])
const loading = ref(true)
const error = ref('')
const selectedId = ref('')
const activity = ref<RepositoryActivity | null>(null)
const activityLoading = ref(false)
const activityError = ref('')
const dialogOpen = ref(false)
let request = 0

const CHECK_ICONS: Record<CheckState, { icon: LucideIcon; class: string }> = {
  success: { icon: CircleCheck, class: 'text-success' },
  failure: { icon: CircleX, class: 'text-danger' },
  pending: { icon: CircleDashed, class: 'text-warning' },
  none: { icon: CircleDot, class: 'text-fg-muted' },
}

const selected = computed(() => repositories.value.find((row) => row.id === selectedId.value))
const repoOptions = computed(() =>
  repositories.value.map((row) => ({ value: row.id, label: row.full_name })),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    repositories.value = await listProjectRepositories(props.sectorId)
    if (!repositories.value.some((row) => row.id === selectedId.value))
      selectedId.value = repositories.value[0]?.id ?? ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Tente novamente.'
  } finally {
    loading.value = false
  }
}

async function loadActivity() {
  const id = selectedId.value
  const current = ++request
  activity.value = null
  activityError.value = ''
  if (!id) return
  activityLoading.value = true
  try {
    const data = await getRepositoryActivity(id)
    if (current === request) activity.value = data
  } catch (cause) {
    if (current === request)
      activityError.value = cause instanceof Error ? cause.message : 'Tente novamente.'
  } finally {
    if (current === request) activityLoading.value = false
  }
}

watch(() => props.sectorId, load, { immediate: true })
watch(selectedId, loadActivity)

function onLinked(rows: ProjectRepository[]) {
  toast.success(
    rows.length > 1 ? `${rows.length} repositórios associados.` : 'Repositório associado.',
  )
  void load().then(() => {
    if (rows[0]) selectedId.value = rows[0].id
  })
}

async function unlink(row: ProjectRepository) {
  const ok = await confirm({
    title: `Desassociar ${row.full_name}?`,
    description:
      'O repositório sai deste projeto, junto com as branches e PRs vinculados às tarefas. Nada muda no GitHub.',
    confirmLabel: 'Desassociar',
    danger: true,
  })
  if (!ok) return
  try {
    await unlinkProjectRepository(props.sectorId, row.id)
    toast.success('Repositório desassociado.')
    await load()
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  }
}
</script>

<template>
  <div class="grid gap-4">
    <ImportGitHubProject v-if="canManage" :sector-id="sectorId" @imported="$emit('imported')" />
    <div v-if="loading" class="grid gap-3" aria-label="Carregando repositórios">
      <UiSkeleton class="h-9 w-72" />
      <div class="grid gap-3 lg:grid-cols-3">
        <UiSkeleton v-for="n in 3" :key="n" class="h-56 rounded-card" />
      </div>
    </div>

    <UiErrorState
      v-else-if="error"
      title="Não foi possível carregar os repositórios"
      :description="error"
      @retry="load"
    />

    <UiEmptyState
      v-else-if="!repositories.length"
      :icon="GitBranch"
      title="Nenhum repositório associado"
      :description="
        canManage
          ? 'Associe repositórios do GitHub para ver branches, PRs e issues aqui e vinculá-los às tarefas.'
          : 'Peça a um gestor do projeto para associar um repositório do GitHub.'
      "
    >
      <template v-if="canManage" #action>
        <UiButton variant="primary" :icon="Plus" @click="dialogOpen = true">
          Associar repositório
        </UiButton>
      </template>
    </UiEmptyState>

    <template v-else>
      <div class="flex flex-wrap items-center gap-2">
        <UiSelect
          v-model="selectedId"
          aria-label="Repositório"
          :options="repoOptions"
          class="w-full sm:w-72"
        />
        <UiBadge v-if="selected?.private"><Lock :size="12" aria-hidden="true" /> Privado</UiBadge>
        <UiButton
          v-if="selected"
          variant="ghost"
          :icon="ExternalLink"
          :href="selected.html_url"
          target="_blank"
          rel="noopener"
        >
          Abrir no GitHub
        </UiButton>
        <span class="flex-1" />
        <template v-if="canManage">
          <UiButton v-if="selected" variant="ghost" :icon="Unlink" @click="unlink(selected)">
            Desassociar
          </UiButton>
          <UiButton :icon="Plus" @click="dialogOpen = true">Associar repositório</UiButton>
        </template>
      </div>

      <div
        v-if="activityLoading"
        class="grid gap-3 lg:grid-cols-3"
        aria-label="Carregando atividade"
      >
        <UiSkeleton v-for="n in 3" :key="n" class="h-56 rounded-card" />
      </div>
      <UiErrorState
        v-else-if="activityError"
        title="Não foi possível ler o repositório"
        :description="activityError"
        @retry="loadActivity"
      />
      <div v-else-if="activity" class="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <UiPanel title="Pull requests" description="Atualizados por último">
          <p v-if="!activity.pulls.length" class="text-13 text-fg-muted">Nenhum pull request.</p>
          <ul v-else class="-mx-1 grid gap-1">
            <li v-for="pull in activity.pulls" :key="pull.number">
              <a
                :href="pull.html_url"
                target="_blank"
                rel="noopener"
                class="grid gap-1 rounded-control px-1 py-1.5 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span class="flex items-start gap-2 text-13 text-fg">
                  <GitPullRequest
                    :size="14"
                    class="mt-0.5 shrink-0 text-fg-muted"
                    aria-hidden="true"
                  />
                  <span class="min-w-0 flex-1 truncate">{{ pull.title }}</span>
                  <component
                    :is="CHECK_ICONS[pull.checks].icon"
                    v-if="pull.checks"
                    :size="14"
                    :class="['mt-0.5 shrink-0', CHECK_ICONS[pull.checks].class]"
                    :aria-label="CHECK_LABELS[pull.checks]"
                    role="img"
                  />
                </span>
                <span class="flex flex-wrap items-center gap-2 pl-6 text-12 text-fg-muted">
                  <UiBadge :tone="PULL_STATES[pull.state]?.tone">
                    {{ PULL_STATES[pull.state]?.label ?? pull.state }}
                  </UiBadge>
                  #{{ pull.number }} · {{ pull.author }} · {{ relativeTime(pull.updated_at) }}
                </span>
              </a>
            </li>
          </ul>
        </UiPanel>

        <UiPanel title="Issues" description="Atualizadas por último">
          <p v-if="!activity.issues.length" class="text-13 text-fg-muted">Nenhuma issue.</p>
          <ul v-else class="-mx-1 grid gap-1">
            <li v-for="issue in activity.issues" :key="issue.number">
              <a
                :href="issue.html_url"
                target="_blank"
                rel="noopener"
                class="grid gap-1 rounded-control px-1 py-1.5 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span class="flex items-start gap-2 text-13 text-fg">
                  <CircleDot
                    :size="14"
                    :class="[
                      'mt-0.5 shrink-0',
                      issue.state === 'open' ? 'text-success' : 'text-fg-muted',
                    ]"
                    :aria-label="issue.state === 'open' ? 'Aberta' : 'Fechada'"
                    role="img"
                  />
                  <span class="min-w-0 flex-1 truncate">{{ issue.title }}</span>
                </span>
                <span class="flex items-center gap-2 pl-6 text-12 text-fg-muted">
                  #{{ issue.number }} · {{ issue.author }} · {{ relativeTime(issue.updated_at) }}
                  <span v-if="issue.comments" class="inline-flex items-center gap-0.5">
                    <MessageSquare :size="12" aria-hidden="true" /> {{ issue.comments }}
                  </span>
                </span>
              </a>
            </li>
          </ul>
        </UiPanel>

        <UiPanel title="Branches">
          <p v-if="!activity.branches.length" class="text-13 text-fg-muted">Nenhuma branch.</p>
          <ul v-else class="-mx-1 grid gap-1">
            <li v-for="branch in activity.branches" :key="branch.name">
              <a
                :href="branch.html_url"
                target="_blank"
                rel="noopener"
                class="flex items-center gap-2 rounded-control px-1 py-1.5 text-13 text-fg hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <GitBranch :size="14" class="shrink-0 text-fg-muted" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate font-mono text-12">{{ branch.name }}</span>
                <UiBadge v-if="branch.name === selected?.default_branch">padrão</UiBadge>
                <Lock
                  v-else-if="branch.protected"
                  :size="12"
                  class="text-fg-muted"
                  aria-label="Protegida"
                />
              </a>
            </li>
          </ul>
        </UiPanel>
      </div>
    </template>

    <LinkRepositoriesDialog
      v-model:open="dialogOpen"
      :sector-id="sectorId"
      :linked="repositories"
      @linked="onLinked"
    />
  </div>
</template>

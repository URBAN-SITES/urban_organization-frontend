<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Lock,
  RefreshCw,
  Search,
  Unplug,
} from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  PageLayout,
  UiAvatar,
  UiBadge,
  UiButton,
  UiEmptyState,
  UiErrorState,
  UiIconButton,
  UiInput,
  UiPanel,
  UiSelect,
  UiSkeleton,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { relativeTime } from '@/shared/utils/time'
import { startGitHubAuthorization } from '../composables'
import {
  disconnectGitHub,
  getGitHubStatus,
  GitHubRequestError,
  listAuthorizedRepositories,
  unlinkGitHubLogin,
} from '../services'
import type { GitHubPurpose, GitHubStatus, RepositoryPage, RepositoryVisibility } from '../types'
import { pageCount } from '../utils'

/** Conta do GitHub: login vinculado, conexão com repositórios e a lista do que o app alcança. */
const confirm = useConfirm()

const status = ref<GitHubStatus | null>(null)
const statusError = ref('')
const busy = ref<'' | GitHubPurpose | 'disconnect' | 'unlink'>('')

const filters = reactive({
  search: '',
  visibility: 'all' as RepositoryVisibility,
  language: '',
  page: 1,
})
const repos = ref<RepositoryPage | null>(null)
const reposLoading = ref(false)
const reposError = ref('')
let request = 0

const VISIBILITY = [
  { value: 'all', label: 'Públicos e privados' },
  { value: 'public', label: 'Públicos' },
  { value: 'private', label: 'Privados' },
]
const languageOptions = computed(() => [
  { value: '', label: 'Todas as linguagens' },
  ...(repos.value?.languages ?? []).map((language) => ({ value: language, label: language })),
])
const pages = computed(() =>
  repos.value ? pageCount(repos.value.count, repos.value.page_size) : 1,
)
const filtering = computed(
  () => !!(filters.search || filters.language || filters.visibility !== 'all'),
)

async function loadStatus() {
  statusError.value = ''
  try {
    status.value = await getGitHubStatus()
    if (status.value.connection) void loadRepos()
  } catch (cause) {
    statusError.value = cause instanceof Error ? cause.message : 'Tente novamente.'
  }
}

async function loadRepos(refresh = false) {
  const current = ++request
  reposLoading.value = true
  reposError.value = ''
  try {
    const page = await listAuthorizedRepositories({ ...filters, refresh })
    if (current === request) repos.value = page
  } catch (cause) {
    if (current !== request) return
    reposError.value = cause instanceof Error ? cause.message : 'Tente novamente.'
    // conexão revogada no GitHub: a tela volta para "Conectar"
    if (cause instanceof GitHubRequestError && cause.code === 'github_not_connected')
      void loadStatus()
  } finally {
    if (current === request) reposLoading.value = false
  }
}

watchDebounced(
  () => [filters.search, filters.visibility, filters.language],
  () => {
    filters.page = 1
    if (status.value?.connection) void loadRepos()
  },
  { debounce: 300 },
)

function goTo(page: number) {
  filters.page = page
  void loadRepos()
}

async function authorize(purpose: GitHubPurpose) {
  busy.value = purpose
  try {
    await startGitHubAuthorization(purpose)
  } catch (cause) {
    busy.value = ''
    toast.error(cause instanceof Error ? cause.message : 'Não foi possível abrir o GitHub.')
  }
}

async function disconnect() {
  const ok = await confirm({
    title: 'Desconectar o GitHub?',
    description:
      'A autorização é revogada no GitHub e os tokens são apagados daqui. Os repositórios já associados a projetos continuam aparecendo, porque usam a instalação do app.',
    confirmLabel: 'Desconectar',
    danger: true,
  })
  if (!ok) return
  busy.value = 'disconnect'
  try {
    const result = await disconnectGitHub()
    toast.success(
      result.revoked
        ? 'GitHub desconectado e autorização revogada.'
        : 'GitHub desconectado. Não conseguimos confirmar a revogação; confira em github.com/settings/apps/authorizations.',
    )
    repos.value = null
    await loadStatus()
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  } finally {
    busy.value = ''
  }
}

async function unlink() {
  const ok = await confirm({
    title: 'Parar de entrar com o GitHub?',
    description: 'Você continua entrando com e-mail e senha.',
    confirmLabel: 'Desvincular',
    danger: true,
  })
  if (!ok) return
  busy.value = 'unlink'
  try {
    await unlinkGitHubLogin()
    toast.success('Login com GitHub desvinculado.')
    await loadStatus()
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  } finally {
    busy.value = ''
  }
}

onMounted(loadStatus)
</script>

<template>
  <PageLayout
    :crumbs="['Integrações', 'GitHub']"
    title="GitHub"
    description="Entre com o GitHub e associe repositórios aos projetos para ver branches, PRs e issues."
  >
    <div v-if="!status && !statusError" class="grid gap-4" aria-label="Carregando">
      <UiSkeleton class="h-28 rounded-card" />
      <UiSkeleton class="h-64 rounded-card" />
    </div>

    <UiErrorState
      v-else-if="statusError"
      title="Não foi possível verificar o GitHub"
      :description="statusError"
      @retry="loadStatus"
    />

    <UiEmptyState
      v-else-if="status && !status.configured"
      :icon="Unplug"
      title="Integração não configurada"
      description="O servidor ainda não tem as credenciais do GitHub App. Quem administra o Inceptum configura isso seguindo o docs/GITHUB.md do backend."
    />

    <template v-else-if="status">
      <UiPanel
        title="Login com GitHub"
        description="Use sua conta do GitHub para entrar no Inceptum. Nenhum token fica guardado para isso."
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-14 text-fg">
            <template v-if="status.identity">
              Vinculado a <span class="font-medium">@{{ status.identity.login }}</span>
            </template>
            <template v-else>Nenhum login do GitHub vinculado.</template>
          </p>
          <UiButton
            v-if="!status.identity"
            :icon="GitBranch"
            :loading="busy === 'link'"
            @click="authorize('link')"
          >
            Vincular login
          </UiButton>
          <div v-else class="flex flex-col items-end gap-1">
            <UiButton
              variant="ghost"
              :loading="busy === 'unlink'"
              :disabled="!status.can_unlink"
              @click="unlink"
            >
              Desvincular
            </UiButton>
            <span v-if="!status.can_unlink" class="text-12 text-fg-muted">
              Defina uma senha em "Esqueci a senha" antes de desvincular.
            </span>
          </div>
        </div>
      </UiPanel>

      <UiPanel
        title="Repositórios"
        description="O Inceptum só lê os repositórios em que você instalou o app. Ele nunca altera nada no GitHub."
      >
        <div v-if="!status.connection" class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-14 text-fg-muted">Conecte sua conta para escolher repositórios.</p>
          <UiButton
            variant="primary"
            :icon="GitBranch"
            :loading="busy === 'connect'"
            @click="authorize('connect')"
          >
            Conectar GitHub
          </UiButton>
        </div>

        <div v-else class="grid gap-4">
          <div class="flex flex-wrap items-center gap-3">
            <UiAvatar
              :name="status.connection.login"
              :src="status.connection.avatar_url"
              size="sm"
            />
            <p class="min-w-0 flex-1 text-14 text-fg">
              Conectado como <span class="font-medium">@{{ status.connection.login }}</span>
            </p>
            <UiButton
              v-if="status.install_url"
              :icon="ExternalLink"
              :href="status.install_url"
              target="_blank"
              rel="noopener"
            >
              Escolher repositórios no GitHub
            </UiButton>
            <UiButton variant="ghost" :loading="busy === 'disconnect'" @click="disconnect">
              Desconectar
            </UiButton>
          </div>

          <div
            class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]"
            role="group"
            aria-label="Filtrar repositórios"
          >
            <UiInput
              v-model="filters.search"
              type="search"
              :icon="Search"
              aria-label="Buscar repositórios"
              placeholder="Buscar repositórios"
            />
            <UiSelect
              v-model="filters.visibility"
              aria-label="Visibilidade"
              :options="VISIBILITY"
            />
            <UiSelect
              v-model="filters.language"
              aria-label="Linguagem"
              :options="languageOptions"
            />
            <UiIconButton
              :icon="RefreshCw"
              label="Atualizar lista do GitHub"
              :disabled="reposLoading"
              @click="loadRepos(true)"
            />
          </div>

          <div
            v-if="reposLoading && !repos"
            class="grid gap-2"
            aria-label="Carregando repositórios"
          >
            <UiSkeleton v-for="n in 4" :key="n" class="h-14 rounded-card" />
          </div>
          <UiErrorState
            v-else-if="reposError"
            title="Não foi possível listar os repositórios"
            :description="reposError"
            :retrying="reposLoading"
            @retry="loadRepos(true)"
          />
          <UiEmptyState
            v-else-if="repos && !repos.results.length"
            :icon="FolderGit2"
            :title="filtering ? 'Nenhum repositório encontrado' : 'Nenhum repositório autorizado'"
            :description="
              filtering
                ? 'Tente outro termo ou limpe os filtros.'
                : 'Instale o app do Inceptum no GitHub e escolha os repositórios que ele pode ler.'
            "
          >
            <template v-if="!filtering && status.install_url" #action>
              <UiButton
                :icon="ExternalLink"
                :href="status.install_url"
                target="_blank"
                rel="noopener"
              >
                Instalar no GitHub
              </UiButton>
            </template>
          </UiEmptyState>
          <template v-else-if="repos">
            <ul
              class="divide-y divide-border rounded-card border border-border"
              :aria-busy="reposLoading"
            >
              <li
                v-for="repo in repos.results"
                :key="repo.id"
                class="flex items-center gap-3 px-4 py-3"
              >
                <span class="min-w-0 flex-1">
                  <a
                    :href="repo.html_url"
                    target="_blank"
                    rel="noopener"
                    class="block truncate rounded-[4px] text-14 font-medium text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {{ repo.full_name }}
                  </a>
                  <span class="block truncate text-12 text-fg-muted">
                    {{ repo.description || 'Sem descrição' }}
                  </span>
                </span>
                <span class="hidden shrink-0 items-center gap-2 text-12 text-fg-muted sm:flex">
                  <span v-if="repo.language">{{ repo.language }}</span>
                  <span v-if="repo.pushed_at">{{ relativeTime(repo.pushed_at) }}</span>
                </span>
                <UiBadge v-if="repo.private"
                  ><Lock :size="12" aria-hidden="true" /> Privado</UiBadge
                >
                <UiBadge v-else>Público</UiBadge>
              </li>
            </ul>
            <nav
              v-if="pages > 1"
              class="flex items-center justify-end gap-2 text-13 text-fg-muted"
              aria-label="Páginas de repositórios"
            >
              <span>Página {{ repos.page }} de {{ pages }} · {{ repos.count }} repositórios</span>
              <UiIconButton
                :icon="ChevronLeft"
                label="Página anterior"
                :disabled="repos.page <= 1 || reposLoading"
                @click="goTo(repos.page - 1)"
              />
              <UiIconButton
                :icon="ChevronRight"
                label="Próxima página"
                :disabled="repos.page >= pages || reposLoading"
                @click="goTo(repos.page + 1)"
              />
            </nav>
          </template>
        </div>
      </UiPanel>
    </template>
  </PageLayout>
</template>

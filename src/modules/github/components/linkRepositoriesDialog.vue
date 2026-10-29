<script setup lang="ts">
import { ChevronLeft, ChevronRight, ExternalLink, GitBranch, Lock, Search } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  UiButton,
  UiCheckbox,
  UiDialog,
  UiEmptyState,
  UiErrorState,
  UiIconButton,
  UiInput,
  UiSkeleton,
} from '@/shared/components'
import type { UUID } from '@/shared/types'
import { startGitHubAuthorization } from '../composables'
import {
  getGitHubStatus,
  GitHubRequestError,
  linkProjectRepositories,
  listAuthorizedRepositories,
} from '../services'
import type { ProjectRepository, RepositoryPage } from '../types'
import { pageCount } from '../utils'

/** Escolher um ou mais repositórios autorizados para o projeto; os já associados ficam travados. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ sectorId: UUID; linked: ProjectRepository[] }>()
const emit = defineEmits<{ linked: [rows: ProjectRepository[]] }>()
const route = useRoute()

const search = ref('')
const page = ref(1)
const result = ref<RepositoryPage | null>(null)
const loading = ref(false)
const error = ref('')
const needsConnection = ref(false)
const notConfigured = ref(false)
const installUrl = ref('')
const selected = ref<number[]>([])
const saving = ref(false)
const saveError = ref('')
let request = 0

const linkedIds = computed(() => new Set(props.linked.map((row) => row.github_id)))
const pages = computed(() =>
  result.value ? pageCount(result.value.count, result.value.page_size) : 1,
)

async function load() {
  const current = ++request
  loading.value = true
  error.value = ''
  try {
    const found = await listAuthorizedRepositories({ search: search.value, page: page.value })
    if (current === request) result.value = found
  } catch (cause) {
    if (current !== request) return
    needsConnection.value =
      cause instanceof GitHubRequestError && cause.code === 'github_not_connected'
    error.value = cause instanceof Error ? cause.message : 'Tente novamente.'
  } finally {
    if (current === request) loading.value = false
  }
}

watch(open, async (value) => {
  if (!value) return
  selected.value = []
  search.value = ''
  page.value = 1
  saveError.value = ''
  result.value = null
  try {
    const status = await getGitHubStatus()
    installUrl.value = status.install_url
    notConfigured.value = !status.configured
    needsConnection.value = status.configured && !status.connection
  } catch {
    notConfigured.value = false
    needsConnection.value = false
  }
  if (!needsConnection.value && !notConfigured.value) void load()
})

watchDebounced(
  search,
  () => {
    page.value = 1
    if (open.value && !needsConnection.value) void load()
  },
  { debounce: 300 },
)

function toggle(id: number, value: boolean) {
  selected.value = value ? [...selected.value, id] : selected.value.filter((item) => item !== id)
}

function goTo(next: number) {
  page.value = next
  void load()
}

async function save() {
  if (!selected.value.length || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    const rows = await linkProjectRepositories(props.sectorId, selected.value)
    emit('linked', rows)
    open.value = false
  } catch (cause) {
    saveError.value = cause instanceof Error ? cause.message : 'Tente novamente.'
  } finally {
    saving.value = false
  }
}

const connect = () => startGitHubAuthorization('connect', route.fullPath)
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="Associar repositórios"
    description="Só aparecem os repositórios em que você instalou o app do Urban Organization."
    size="lg"
    :dismissible="!saving"
  >
    <UiEmptyState
      v-if="notConfigured"
      :icon="GitBranch"
      title="Integração não configurada"
      description="O servidor ainda não tem as credenciais do GitHub App. Veja o docs/GITHUB.md do backend."
    />

    <UiEmptyState
      v-else-if="needsConnection"
      :icon="GitBranch"
      title="Conecte o GitHub primeiro"
      description="Depois de conectar, você volta para cá e escolhe os repositórios."
    >
      <template #action>
        <UiButton variant="primary" :icon="GitBranch" @click="connect">Conectar GitHub</UiButton>
      </template>
    </UiEmptyState>

    <div v-else class="grid gap-3">
      <UiInput
        v-model="search"
        type="search"
        :icon="Search"
        aria-label="Buscar repositórios"
        placeholder="Buscar repositórios"
      />
      <div v-if="loading && !result" class="grid gap-2" aria-label="Carregando repositórios">
        <UiSkeleton v-for="n in 4" :key="n" class="h-12 rounded-card" />
      </div>
      <UiErrorState
        v-else-if="error"
        title="Não foi possível listar os repositórios"
        :description="error"
        :retrying="loading"
        @retry="load"
      />
      <UiEmptyState
        v-else-if="result && !result.results.length"
        :icon="GitBranch"
        :title="search ? 'Nenhum repositório encontrado' : 'Nenhum repositório autorizado'"
        :description="
          search ? 'Tente outro termo.' : 'Instale o app no GitHub e escolha os repositórios.'
        "
      >
        <template v-if="!search && installUrl" #action>
          <UiButton :icon="ExternalLink" :href="installUrl" target="_blank" rel="noopener">
            Instalar no GitHub
          </UiButton>
        </template>
      </UiEmptyState>
      <ul
        v-else-if="result"
        class="max-h-80 divide-y divide-border overflow-y-auto rounded-card border border-border"
        :aria-busy="loading"
      >
        <li v-for="repo in result.results" :key="repo.id" class="flex items-center gap-3 px-3 py-2">
          <UiCheckbox
            :model-value="linkedIds.has(repo.id) || selected.includes(repo.id)"
            :disabled="linkedIds.has(repo.id)"
            :aria-label="`Associar ${repo.full_name}`"
            @update:model-value="toggle(repo.id, $event)"
          />
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-1.5 truncate text-14 text-fg">
              {{ repo.full_name }}
              <Lock v-if="repo.private" :size="12" class="text-fg-muted" aria-label="Privado" />
            </span>
            <span class="block truncate text-12 text-fg-muted">
              {{
                linkedIds.has(repo.id)
                  ? 'Já associado a este projeto'
                  : repo.language || 'Sem linguagem'
              }}
            </span>
          </span>
        </li>
      </ul>
      <nav
        v-if="result && pages > 1"
        class="flex items-center justify-end gap-2 text-13 text-fg-muted"
        aria-label="Páginas"
      >
        <span>{{ result.page }} de {{ pages }}</span>
        <UiIconButton
          :icon="ChevronLeft"
          label="Página anterior"
          :disabled="result.page <= 1 || loading"
          @click="goTo(result.page - 1)"
        />
        <UiIconButton
          :icon="ChevronRight"
          label="Próxima página"
          :disabled="result.page >= pages || loading"
          @click="goTo(result.page + 1)"
        />
      </nav>
      <p v-if="saveError" role="alert" class="text-13 text-danger">{{ saveError }}</p>
    </div>

    <template #footer>
      <UiButton :disabled="saving" @click="open = false">Cancelar</UiButton>
      <UiButton
        v-if="!needsConnection && !notConfigured"
        variant="primary"
        :loading="saving"
        :disabled="!selected.length"
        @click="save"
      >
        Associar {{ selected.length > 1 ? `${selected.length} repositórios` : '' }}
      </UiButton>
    </template>
  </UiDialog>
</template>

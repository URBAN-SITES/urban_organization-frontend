<script setup lang="ts">
import { Download, ExternalLink, RefreshCw } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { UiButton, UiPanel, UiSelect } from '@/shared/components'
import type { UUID } from '@/shared/types'
import { GitHubRequestError, importGitHubProject, listGitHubProjects } from '../services'
import type { GitHubProjectBoard } from '../types'

/**
 * Traz o quadro de um GitHub Project para este projeto: colunas viram colunas e cartões
 * viram tarefas. Importar de novo atualiza as mesmas tarefas e traz as novas.
 */
const props = defineProps<{ sectorId: UUID }>()
const emit = defineEmits<{ imported: [] }>()

const boards = ref<GitHubProjectBoard[] | null>(null)
const selected = ref('')
const loading = ref(false)
const importing = ref(false)
const problem = ref('')
const needsConnection = ref(false)

const options = computed(() =>
  (boards.value ?? []).map((board) => ({
    value: board.id,
    label: `${board.owner} / ${board.title}${board.closed ? ' (fechado)' : ''}`,
  })),
)

function explain(cause: unknown, fallback: string) {
  needsConnection.value =
    cause instanceof GitHubRequestError &&
    (cause.code === 'github_not_connected' || cause.code === 'github_not_configured')
  problem.value =
    cause instanceof GitHubRequestError && cause.code === 'github_forbidden'
      ? 'O GitHub App ainda não tem permissão para ler Projects. Quem administra o app precisa dar a permissão "Projects: Read" e aceitar no GitHub.'
      : cause instanceof Error
        ? cause.message
        : fallback
}

async function loadBoards() {
  loading.value = true
  problem.value = ''
  try {
    boards.value = await listGitHubProjects()
    selected.value = boards.value[0]?.id ?? ''
  } catch (cause) {
    explain(cause, 'Não foi possível listar os quadros do GitHub.')
  } finally {
    loading.value = false
  }
}

async function run() {
  if (!selected.value || importing.value) return
  importing.value = true
  problem.value = ''
  try {
    const result = await importGitHubProject(props.sectorId, selected.value)
    const parts = [
      `${result.created} ${result.created === 1 ? 'tarefa nova' : 'tarefas novas'}`,
      `${result.updated} ${result.updated === 1 ? 'atualizada' : 'atualizadas'}`,
    ]
    if (result.columns_created)
      parts.push(
        `${result.columns_created} ${result.columns_created === 1 ? 'coluna criada' : 'colunas criadas'}`,
      )
    toast.success(`Quadro "${result.project}" importado`, { description: parts.join(' · ') })
    emit('imported')
  } catch (cause) {
    explain(cause, 'Não foi possível importar o quadro do GitHub.')
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <UiPanel
    title="Importar de um GitHub Project"
    description="As colunas do quadro viram colunas do Kanban e cada cartão vira uma tarefa. Importar de novo atualiza as mesmas tarefas e traz as novas, sem duplicar."
  >
    <div class="flex flex-wrap items-center gap-2">
      <UiButton v-if="boards === null" :icon="Download" :loading="loading" @click="loadBoards">
        Escolher quadro
      </UiButton>
      <template v-else-if="boards.length">
        <UiSelect
          v-model="selected"
          :options="options"
          aria-label="Quadro do GitHub"
          class="min-w-0 flex-1 sm:max-w-sm"
        />
        <UiButton variant="primary" :icon="Download" :loading="importing" @click="run">
          Importar
        </UiButton>
        <UiButton variant="ghost" :icon="RefreshCw" :loading="loading" @click="loadBoards">
          Atualizar lista
        </UiButton>
      </template>
      <p v-else class="text-13 text-fg-muted">
        Nenhum quadro encontrado na sua conta do GitHub nem nas suas organizações.
      </p>
    </div>
    <p v-if="problem" role="alert" class="mt-3 text-13 text-danger">
      {{ problem }}
      <RouterLink
        v-if="needsConnection"
        to="/integracoes/github"
        class="ml-1 inline-flex items-center gap-1 font-medium text-fg underline"
      >
        Conectar o GitHub <ExternalLink :size="12" aria-hidden="true" />
      </RouterLink>
    </p>
  </UiPanel>
</template>

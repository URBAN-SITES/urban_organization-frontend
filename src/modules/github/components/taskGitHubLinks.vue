<script setup lang="ts">
import { GitBranch, GitPullRequest, Link2, Search, X } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { UiBadge, UiButton, UiIconButton, UiInput, UiPopover, UiSpinner } from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import type { UUID } from '@/shared/types'
import { linkTaskRef, listTaskGitHubLinks, searchTaskRefs, unlinkTaskRef } from '../services'
import type { RefOption, TaskGitHubLink } from '../types'
import { PULL_STATES } from '../utils'

/** Branches e PRs vinculados à tarefa; editores buscam nos repositórios do projeto. */
const props = defineProps<{ taskId: UUID; canEdit: boolean }>()
const confirm = useConfirm()

const links = ref<TaskGitHubLink[]>([])
const loading = ref(true)
const error = ref('')
const query = ref('')
const options = ref<RefOption[]>([])
const searching = ref(false)
const searchError = ref('')
const linking = ref('')
let request = 0

async function load() {
  loading.value = true
  error.value = ''
  try {
    links.value = await listTaskGitHubLinks(props.taskId)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Tente novamente.'
  } finally {
    loading.value = false
  }
}
watch(() => props.taskId, load, { immediate: true })

async function search() {
  const current = ++request
  searching.value = true
  searchError.value = ''
  try {
    const found = await searchTaskRefs(props.taskId, query.value)
    if (current === request) options.value = found
  } catch (cause) {
    if (current === request) {
      options.value = []
      searchError.value = cause instanceof Error ? cause.message : 'Tente novamente.'
    }
  } finally {
    if (current === request) searching.value = false
  }
}
watchDebounced(query, search, { debounce: 350 })

const optionKey = (option: RefOption) => `${option.repository_id}:${option.kind}:${option.ref}`
const isLinked = (option: RefOption) =>
  links.value.some(
    (link) =>
      link.repository_id === option.repository_id &&
      link.kind === option.kind &&
      link.ref === option.ref,
  )

async function link(option: RefOption, close: () => void) {
  if (isLinked(option) || linking.value) return
  linking.value = optionKey(option)
  try {
    const created = await linkTaskRef(props.taskId, {
      repository_id: option.repository_id,
      kind: option.kind,
      ref: option.ref,
    })
    links.value = [...links.value, created]
    toast.success(option.kind === 'pull' ? 'Pull request vinculado.' : 'Branch vinculada.')
    close()
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  } finally {
    linking.value = ''
  }
}

async function unlink(item: TaskGitHubLink) {
  const ok = await confirm({
    title: 'Desvincular da tarefa?',
    description: `${item.kind === 'pull' ? `O PR #${item.ref}` : `A branch ${item.ref}`} continua no GitHub; só sai desta tarefa.`,
    confirmLabel: 'Desvincular',
    danger: true,
  })
  if (!ok) return
  try {
    await unlinkTaskRef(props.taskId, item.id)
    links.value = links.value.filter((row) => row.id !== item.id)
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  }
}
</script>

<template>
  <section class="grid gap-2" aria-labelledby="task-github-title">
    <div class="flex items-center justify-between gap-2">
      <h3 id="task-github-title" class="text-13 font-medium text-fg">GitHub</h3>
      <UiPopover v-if="canEdit" label="Vincular branch ou PR" placement="bottom-end">
        <template #trigger="{ props: trigger }">
          <UiButton v-bind="trigger" size="sm" variant="ghost" :icon="Link2" @click="search">
            Vincular branch ou PR
          </UiButton>
        </template>
        <template #default="{ close }">
          <div class="grid w-80 max-w-[calc(100vw-2rem)] gap-2">
            <UiInput
              v-model="query"
              type="search"
              :icon="Search"
              aria-label="Buscar branch ou PR"
              placeholder="Nome da branch, título ou número do PR"
            />
            <p
              v-if="searching"
              role="status"
              class="flex items-center gap-2 px-1 text-12 text-fg-muted"
            >
              <UiSpinner :size="12" /> Buscando nos repositórios do projeto…
            </p>
            <p v-else-if="searchError" role="alert" class="px-1 text-12 text-danger">
              {{ searchError }}
            </p>
            <p v-else-if="!options.length" class="px-1 text-12 text-fg-muted">
              Nada encontrado. O projeto precisa de um repositório associado na aba GitHub.
            </p>
            <ul v-else class="grid max-h-64 gap-0.5 overflow-y-auto" aria-label="Resultados">
              <li v-for="option in options" :key="optionKey(option)">
                <button
                  type="button"
                  :disabled="isLinked(option) || !!linking"
                  class="flex w-full cursor-pointer items-start gap-2 rounded-control px-2 py-1.5 text-left text-13 text-fg hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none disabled:cursor-default disabled:opacity-60"
                  @click="link(option, close)"
                >
                  <component
                    :is="option.kind === 'pull' ? GitPullRequest : GitBranch"
                    :size="14"
                    class="mt-0.5 shrink-0 text-fg-muted"
                    aria-hidden="true"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate">
                      {{ option.kind === 'pull' ? `#${option.ref} ${option.title}` : option.ref }}
                    </span>
                    <span class="block truncate text-12 text-fg-muted">
                      {{ option.repository }}{{ isLinked(option) ? ' · já vinculado' : '' }}
                    </span>
                  </span>
                  <UiSpinner v-if="linking === optionKey(option)" :size="12" class="mt-1" />
                </button>
              </li>
            </ul>
          </div>
        </template>
      </UiPopover>
    </div>

    <p v-if="loading" class="text-13 text-fg-muted" role="status">Carregando…</p>
    <p v-else-if="error" role="alert" class="text-13 text-danger">
      {{ error }}
      <button type="button" class="cursor-pointer underline" @click="load">Tentar de novo</button>
    </p>
    <p v-else-if="!links.length" class="text-13 text-fg-muted">Nenhuma branch ou PR vinculado.</p>
    <ul v-else class="divide-y divide-border rounded-card border border-border">
      <li v-for="item in links" :key="item.id" class="flex items-center gap-2 px-3 py-2">
        <component
          :is="item.kind === 'pull' ? GitPullRequest : GitBranch"
          :size="14"
          class="shrink-0 text-fg-muted"
          aria-hidden="true"
        />
        <a
          :href="item.html_url"
          target="_blank"
          rel="noopener"
          class="min-w-0 flex-1 truncate rounded-[4px] text-13 text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {{ item.kind === 'pull' ? `#${item.ref} ${item.title}` : item.ref }}
          <span class="text-12 text-fg-muted">· {{ item.repository }}</span>
        </a>
        <UiBadge v-if="item.state && PULL_STATES[item.state]" :tone="PULL_STATES[item.state]!.tone">
          {{ PULL_STATES[item.state]!.label }}
        </UiBadge>
        <UiIconButton
          v-if="canEdit"
          :icon="X"
          size="sm"
          :label="`Desvincular ${item.kind === 'pull' ? `PR #${item.ref}` : item.ref}`"
          @click="unlink(item)"
        />
      </li>
    </ul>
  </section>
</template>

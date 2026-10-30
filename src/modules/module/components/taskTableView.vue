<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ListX } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiAvatar, UiEmptyState, UiErrorState, UiIconButton, UiSkeleton } from '@/shared/components'
import type { Page } from '@/shared/types'
import { listTasks } from '../services'
import type { Status, Task, TaskFilters } from '../types'
import LabelChip from './labelChip.vue'
import { PRIORITY_TEXT, priorityOf, shortDate } from './priority'

/** Tabela paginada, filtrada e ordenada no servidor. */
const props = defineProps<{
  sectorId: string
  statuses: Status[]
  filters: TaskFilters
  /** muda quando algo foi salvo no quadro/painel, para recarregar */
  version: number
}>()
const emit = defineEmits<{ open: [taskId: string] }>()

const COLUMNS = [
  { key: 'title', label: 'Tarefa', sort: null },
  { key: 'status', label: 'Status', sort: null },
  { key: 'priority', label: 'Prioridade', sort: 'priority' },
  { key: 'assignee', label: 'Responsável', sort: null },
  { key: 'due_date', label: 'Prazo', sort: 'due_date' },
  { key: 'created_at', label: 'Criada', sort: 'created_at' },
] as const
const ordering = ref('-created_at')
const page = ref(1)
const result = ref<Page<Task> | null>(null)
const loading = ref(true)
const error = ref('')
let latest = 0

const statusName = computed(() => new Map(props.statuses.map((s) => [s.id, s.name])))

async function load() {
  const request = ++latest
  loading.value = true
  error.value = ''
  try {
    const data = await listTasks(props.sectorId, {
      ...props.filters,
      ordering: ordering.value,
      page: page.value,
    })
    if (request === latest) result.value = data
  } catch (cause) {
    if (request === latest) error.value = getErrorMessage(cause, 'Tente novamente.')
  } finally {
    if (request === latest) loading.value = false
  }
}

watch(
  () => [props.sectorId, JSON.stringify(props.filters)],
  () => {
    page.value = 1
    void load()
  },
  { immediate: true },
)
watch(() => props.version, load)

function sortBy(field: string) {
  ordering.value = ordering.value === field ? `-${field}` : field
  page.value = 1
  void load()
}

function ariaSort(field: string | null) {
  if (!field) return undefined
  if (ordering.value === field) return 'ascending'
  if (ordering.value === `-${field}`) return 'descending'
  return 'none'
}

function changePage(offset: number) {
  page.value += offset
  void load()
}
</script>

<template>
  <div class="overflow-hidden uo-card">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[720px] text-left text-13">
        <caption class="sr-only">
          Tarefas do projeto
        </caption>
        <thead class="border-b border-border text-12 text-fg-muted">
          <tr>
            <th
              v-for="column in COLUMNS"
              :key="column.key"
              scope="col"
              :aria-sort="ariaSort(column.sort)"
              class="h-10 px-3 font-medium first:pl-4"
            >
              <button
                v-if="column.sort"
                type="button"
                class="inline-flex cursor-pointer items-center gap-1 rounded-[4px] hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
                @click="sortBy(column.sort)"
              >
                {{ column.label }}
                <ArrowUp v-if="ordering === column.sort" :size="12" aria-hidden="true" />
                <ArrowDown
                  v-else-if="ordering === `-${column.sort}`"
                  :size="12"
                  aria-hidden="true"
                />
              </button>
              <template v-else>{{ column.label }}</template>
            </th>
          </tr>
        </thead>
        <tbody v-if="loading && !result">
          <tr v-for="n in 5" :key="n" class="border-b border-border last:border-0">
            <td v-for="column in COLUMNS" :key="column.key" class="px-3 py-3 first:pl-4">
              <UiSkeleton class="h-3" />
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="result?.results.length" :class="loading ? 'opacity-60' : ''">
          <tr
            v-for="task in result.results"
            :key="task.id"
            class="relative border-b border-border last:border-0 hover:bg-surface-2"
          >
            <th scope="row" class="max-w-80 px-3 py-2.5 pl-4 font-normal">
              <a
                href="#"
                :class="[
                  'block truncate rounded-[4px] text-14 after:absolute after:inset-0 after:content-[\'\'] focus-visible:outline-2 focus-visible:outline-accent',
                  task.completed_at ? 'text-fg-muted line-through' : 'text-fg',
                ]"
                @click.prevent="emit('open', task.id)"
              >
                {{ task.title }}
              </a>
              <span v-if="task.labels.length" class="mt-1 flex gap-1">
                <LabelChip
                  v-for="label in task.labels.slice(0, 2)"
                  :key="label.id"
                  :label="label"
                />
              </span>
            </th>
            <td class="px-3 text-fg-muted">{{ statusName.get(task.status_id) ?? '—' }}</td>
            <td class="px-3">
              <span
                :class="[
                  'inline-flex items-center gap-1',
                  PRIORITY_TEXT[priorityOf(task.priority).tone],
                ]"
              >
                <component :is="priorityOf(task.priority).icon" :size="14" aria-hidden="true" />
                {{ priorityOf(task.priority).label }}
              </span>
            </td>
            <td class="px-3">
              <span v-if="task.assignee_name" class="inline-flex items-center gap-2 text-fg">
                <UiAvatar :name="task.assignee_name" size="xs" />
                <span class="max-w-32 truncate">{{ task.assignee_name }}</span>
              </span>
              <span v-else class="text-fg-muted">—</span>
            </td>
            <td
              :class="[
                'px-3 tabular-nums',
                task.is_overdue ? 'font-medium text-danger' : 'text-fg-muted',
              ]"
            >
              {{ task.due_date ? shortDate(task.due_date) : '—' }}
            </td>
            <td class="px-3 text-fg-muted tabular-nums">
              {{ new Date(task.created_at).toLocaleDateString('pt-BR') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <UiErrorState
      v-if="error"
      title="Não foi possível carregar a tabela"
      :description="error"
      @retry="load"
    />
    <UiEmptyState
      v-else-if="!loading && !result?.results.length"
      :icon="ListX"
      title="Nenhuma tarefa encontrada"
      description="Ajuste os filtros ou crie uma tarefa."
    />
    <footer
      v-if="result && (result.next || result.previous)"
      class="flex items-center justify-between gap-2 border-t border-border px-4 py-2 text-13 text-fg-muted"
    >
      <span>Página {{ page }} · {{ result.count }} tarefas</span>
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
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Ban, CalendarClock, Check, Trash2 } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { TaskGitHubLinks } from '@/modules/github'
import { TaskCharges } from '@/modules/payments'
import {
  UiAvatar,
  UiButton,
  UiDrawer,
  UiInput,
  UiSelect,
  UiSpinner,
  UiTextarea,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { useKanbanStore } from '../stores'
import type { Cycle, Label, Person, Task, UpdateTaskRequest } from '../types'
import LabelChip from './labelChip.vue'
import LabelPicker from './labelPicker.vue'
import { PRIORITIES, PRIORITY_TEXT, priorityOf, shortDate } from './priority'
import TaskAttachments from './taskAttachments.vue'
import TaskChecklist from './taskChecklist.vue'
import TaskConversation from './taskConversation.vue'
import TaskRelations from './taskRelations.vue'
import TaskSubtasks from './taskSubtasks.vue'

/**
 * Painel lateral da tarefa. Sem `taskId` cria uma tarefa; com `taskId` mostra os detalhes
 * e cada campo salva sozinho ao mudar.
 */
const open = defineModel<boolean>('open', { required: true })
const taskId = defineModel<string | null>('taskId', { required: true })
const props = defineProps<{
  sectorId: string
  sectorName: string
  people: Person[]
  labels: Label[]
  cycles: Cycle[]
  initialStatus: string
  canEdit: boolean
  canManage: boolean
}>()
const emit = defineEmits<{ labelCreated: [label: Label] }>()
const kanban = useKanbanStore()
const confirm = useConfirm()

const task = computed<Task | null>(
  () => kanban.tasks.find((row) => row.id === taskId.value) ?? null,
)
const currentStatus = computed(() =>
  kanban.statuses.find((status) => status.id === task.value?.status_id),
)
const STATUS_TONES = { todo: '#a1a1aa', in_progress: '#f99f11', done: '#4cc38a' } as const
const statusTone = computed(() => STATUS_TONES[currentStatus.value?.category ?? 'todo'])
const currentPriority = computed(() => priorityOf(task.value?.priority ?? 'medium'))
const steps = computed(() => ({
  done: (task.value?.subtask_done ?? 0) + (task.value?.checklist_done ?? 0),
  total: (task.value?.subtask_total ?? 0) + (task.value?.checklist_total ?? 0),
}))
const parent = computed(() =>
  task.value?.parent_id ? kanban.tasks.find((row) => row.id === task.value!.parent_id) : null,
)
const form = reactive({
  title: '',
  description: '',
  status: '',
  priority: 'medium' as Task['priority'],
  assignee: '',
  start: '',
  due: '',
  cycle: '',
  labels: [] as string[],
})
const titleError = ref('')
const state = ref<'idle' | 'saving' | 'saved'>('idle')
const creating = ref(false)

const statusOptions = computed(() =>
  kanban.statuses.map((status) => ({ value: status.id, label: status.name })),
)
const priorityOptions = PRIORITIES.map((p) => ({ value: p.value, label: p.label }))
const peopleOptions = computed(() => [
  { value: '', label: 'Sem responsável' },
  ...props.people.map((person) => ({ value: person.id, label: person.name || person.email })),
])
const cycleOptions = computed(() => [
  { value: '', label: 'Sem ciclo' },
  ...props.cycles
    .filter((cycle) => cycle.state !== 'completed' || cycle.id === form.cycle)
    .map((cycle) => ({ value: cycle.id, label: cycle.name })),
])
const datesError = computed(() =>
  form.start && form.due && form.start > form.due ? 'O início precisa ser antes do prazo.' : '',
)
function saveDates() {
  if (!task.value || datesError.value) return
  const start = form.start || null
  const due = form.due || null
  if (start === task.value.start_date && due === task.value.due_date) return
  void save({ start_date: start, due_date: due })
}
const chosenLabels = computed(() => props.labels.filter((l) => form.labels.includes(l.id)))
const readOnly = computed(() => !props.canEdit)

function fill() {
  const t = task.value
  Object.assign(form, {
    title: t?.title ?? '',
    description: t?.description ?? '',
    status: t?.status_id ?? (props.initialStatus || kanban.statuses[0]?.id || ''),
    priority: t?.priority ?? 'medium',
    assignee: t?.assignee_id ?? '',
    start: t?.start_date ?? '',
    due: t?.due_date ?? '',
    cycle: t?.cycle_id ?? '',
    labels: t?.labels.map((label) => label.id) ?? [],
  })
  titleError.value = ''
  state.value = 'idle'
}
watch(
  () => [open.value, taskId.value] as const,
  ([isOpen]) => isOpen && fill(),
  { immediate: true },
)

// ── edição (cada campo salva sozinho) ─────────────────────────────────────
async function save(payload: UpdateTaskRequest) {
  const id = taskId.value
  if (!id || readOnly.value) return
  state.value = 'saving'
  try {
    await kanban.editTask(id, payload)
    if (taskId.value === id) state.value = 'saved'
  } catch (cause) {
    state.value = 'idle'
    toast.error(getErrorMessage(cause, 'Não foi possível salvar a alteração.'))
    if (taskId.value === id) fill()
  }
}

function saveTitle() {
  const value = form.title.trim()
  if (!task.value || value === task.value.title) return
  titleError.value = value ? '' : 'A tarefa precisa de um título.'
  if (!value) {
    form.title = task.value.title
    return
  }
  void save({ title: value })
}

function saveDescription() {
  if (task.value && form.description !== task.value.description)
    void save({ description: form.description })
}

async function changeStatus(value: string) {
  const id = taskId.value
  if (!id || !task.value || value === task.value.status_id) return
  state.value = 'saving'
  try {
    await kanban.move(id, value)
    state.value = 'saved'
  } catch (cause) {
    state.value = 'idle'
    toast.error(getErrorMessage(cause, 'Não foi possível mudar o status.'))
    fill()
  }
}

watch(
  () => form.labels,
  (ids, old) => {
    if (!task.value || ids === old) return
    const current = task.value.labels.map((label) => label.id)
    if (ids.length === current.length && ids.every((id) => current.includes(id))) return
    void save({ label_ids: ids })
  },
)

async function remove() {
  const t = task.value
  if (!t) return
  const ok = await confirm({
    title: `Excluir “${t.title}”?`,
    description: t.subtask_total
      ? 'A tarefa e as subtarefas dela saem do projeto para todos.'
      : 'A tarefa sai do projeto para todos.',
    confirmLabel: 'Excluir tarefa',
    danger: true,
  })
  if (!ok) return
  try {
    await kanban.removeTask(t.id)
    toast.success('Tarefa excluída.')
    open.value = false
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível excluir a tarefa.'))
  }
}

// ── criação ───────────────────────────────────────────────────────────────
async function create() {
  const title = form.title.trim()
  titleError.value = title ? '' : 'Dê um título para a tarefa.'
  if (titleError.value || datesError.value || creating.value) return
  creating.value = true
  try {
    const created = await kanban.addTask({
      title: title.slice(0, 255),
      description: form.description,
      priority: form.priority,
      start_date: form.start || null,
      due_date: form.due || null,
      cycle: form.cycle || null,
      assignee: form.assignee || null,
      label_ids: form.labels,
      ...(form.status && { status: form.status }),
    })
    toast.success('Tarefa criada.')
    taskId.value = created.id // segue no painel para completar os detalhes
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível criar a tarefa.'))
  } finally {
    creating.value = false
  }
}

const refresh = () => task.value && kanban.reload(task.value.id).catch(() => undefined)
</script>

<template>
  <UiDrawer
    v-model:open="open"
    :title="task ? 'Tarefa' : 'Nova tarefa'"
    :description="sectorName"
    width="lg"
  >
    <!-- criar -->
    <form v-if="!taskId" class="grid gap-4" novalidate @submit.prevent="create">
      <UiInput
        v-model="form.title"
        label="Título"
        maxlength="255"
        required
        size="lg"
        :error="titleError"
        @update:model-value="titleError && form.title.trim() && (titleError = '')"
      />
      <UiTextarea v-model="form.description" label="Descrição" :rows="4" />
      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect v-model="form.status" label="Status" :options="statusOptions" />
        <UiSelect v-model="form.priority" label="Prioridade" :options="priorityOptions" />
        <UiSelect
          v-model="form.assignee"
          label="Responsável"
          :options="peopleOptions"
          :class="cycles.length ? '' : 'sm:col-span-2'"
        />
        <UiSelect v-if="cycles.length" v-model="form.cycle" label="Ciclo" :options="cycleOptions" />
        <UiInput v-model="form.start" type="date" label="Início" />
        <UiInput v-model="form.due" type="date" label="Prazo" :error="datesError" />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <LabelChip v-for="label in chosenLabels" :key="label.id" :label="label" />
        <LabelPicker
          v-model="form.labels"
          :sector-id="sectorId"
          :labels="labels"
          @created="emit('labelCreated', $event)"
        />
      </div>
      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <UiButton @click="open = false">Cancelar</UiButton>
        <UiButton type="submit" variant="primary" :loading="creating">Criar tarefa</UiButton>
      </div>
    </form>

    <!-- detalhes -->
    <div v-else-if="task" class="grid gap-6">
      <div class="grid gap-1">
        <button
          v-if="parent"
          type="button"
          class="inline-flex w-fit cursor-pointer items-center gap-1 rounded-[4px] text-12 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
          @click="taskId = parent.id"
        >
          <ArrowLeft :size="12" aria-hidden="true" />
          Subtarefa de {{ parent.title }}
        </button>
        <label for="task-title" class="sr-only">Título</label>
        <input
          id="task-title"
          v-model="form.title"
          maxlength="255"
          :readonly="readOnly"
          :aria-invalid="!!titleError"
          :aria-describedby="titleError ? 'task-title-error' : undefined"
          class="-mx-2 rounded-control border border-transparent bg-transparent px-2 py-1 text-20 leading-tight font-semibold text-fg hover:border-border focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/40 read-only:hover:border-transparent"
          @blur="saveTitle"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        />
        <p v-if="titleError" id="task-title-error" role="alert" class="text-12 text-danger">
          {{ titleError }}
        </p>
        <p class="flex h-4 items-center gap-1 text-12 text-fg-muted" aria-live="polite">
          <template v-if="state === 'saving'"><UiSpinner :size="12" /> Salvando…</template>
          <template v-else-if="state === 'saved'"
            ><Check :size="12" aria-hidden="true" /> Salvo</template
          >
          <template v-else-if="task.completed_at">
            Concluída em {{ new Date(task.completed_at).toLocaleDateString('pt-BR') }}
          </template>
        </p>
      </div>

      <ul class="task-summary" aria-label="Resumo da tarefa">
        <li :style="{ '--tone': currentStatus?.color || statusTone }">
          <span class="task-summary-dot" aria-hidden="true" />
          {{ currentStatus?.name ?? 'Sem status' }}
        </li>
        <li :class="PRIORITY_TEXT[currentPriority.tone]">
          <component :is="currentPriority.icon" :size="14" aria-hidden="true" />
          {{ currentPriority.label }}
        </li>
        <li
          v-if="task.due_date"
          :class="task.is_overdue && !task.completed_at ? 'text-danger' : ''"
        >
          <CalendarClock :size="14" aria-hidden="true" />
          {{ task.is_overdue && !task.completed_at ? 'Atrasada · ' : ''
          }}{{ shortDate(task.due_date) }}
        </li>
        <li v-if="task.is_blocked && !task.completed_at" class="text-danger">
          <Ban :size="14" aria-hidden="true" />
          Bloqueada
        </li>
        <li v-if="task.assignee_name">
          <UiAvatar :name="task.assignee_name" size="xs" />
          {{ task.assignee_name }}
        </li>
        <li v-if="steps.total">
          <span class="uo-meter w-16" aria-hidden="true">
            <span :style="{ width: `${(steps.done * 100) / steps.total}%` }" />
          </span>
          {{ steps.done }}/{{ steps.total }} itens
        </li>
      </ul>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect
          v-model="form.status"
          label="Status"
          :options="statusOptions"
          :disabled="readOnly"
          @update:model-value="changeStatus"
        />
        <UiSelect
          v-model="form.priority"
          label="Prioridade"
          :options="priorityOptions"
          :disabled="readOnly"
          @update:model-value="save({ priority: $event as Task['priority'] })"
        />
        <UiSelect
          v-model="form.assignee"
          label="Responsável"
          :options="peopleOptions"
          :disabled="readOnly"
          :class="cycles.length || task.cycle_id ? '' : 'sm:col-span-2'"
          @update:model-value="save({ assignee: $event || null })"
        />
        <UiSelect
          v-if="cycles.length || task.cycle_id"
          v-model="form.cycle"
          label="Ciclo"
          :options="cycleOptions"
          :disabled="readOnly"
          @update:model-value="save({ cycle: $event || null })"
        />
        <UiInput
          v-model="form.start"
          type="date"
          label="Início"
          :disabled="readOnly"
          @change="saveDates"
        />
        <UiInput
          v-model="form.due"
          type="date"
          label="Prazo"
          :disabled="readOnly"
          :error="datesError"
          :hint="task.is_overdue ? 'Atrasada' : undefined"
          @change="saveDates"
        />
      </div>

      <div class="grid gap-2">
        <span class="text-13 font-medium text-fg">Etiquetas</span>
        <div class="flex flex-wrap items-center gap-2">
          <LabelChip v-for="label in chosenLabels" :key="label.id" :label="label" />
          <span v-if="!chosenLabels.length && readOnly" class="text-13 text-fg-muted">Nenhuma</span>
          <LabelPicker
            v-if="!readOnly"
            v-model="form.labels"
            :sector-id="sectorId"
            :labels="labels"
            @created="emit('labelCreated', $event)"
          />
        </div>
      </div>

      <UiTextarea
        v-model="form.description"
        label="Descrição"
        :rows="5"
        :disabled="readOnly"
        placeholder="Contexto, critérios de aceite, links…"
        @blur="saveDescription"
      />

      <TaskSubtasks
        v-if="!task.parent_id"
        :task="task"
        :can-edit="canEdit"
        @open="taskId = $event"
      />
      <TaskRelations :task-id="task.id" :can-edit="canEdit" @open="taskId = $event" />
      <TaskChecklist :task-id="task.id" :can-edit="canEdit" @changed="refresh" />
      <TaskAttachments :task-id="task.id" :due-date="task.due_date ?? ''" :can-edit="canEdit" />
      <TaskGitHubLinks :task-id="task.id" :can-edit="canEdit" />
      <TaskCharges :task-id="task.id" :can-edit="canEdit" />
      <TaskConversation
        :task-id="task.id"
        :people="people"
        :can-comment="canEdit"
        :can-manage="canManage"
        @changed="refresh"
      />

      <div v-if="canEdit" class="flex justify-between gap-2 border-t border-border pt-4">
        <span class="text-12 text-fg-muted">
          Criada {{ task.created_by_name ? `por ${task.created_by_name}` : '' }} em
          {{ new Date(task.created_at).toLocaleDateString('pt-BR') }}
        </span>
        <UiButton variant="danger" size="sm" :icon="Trash2" @click="remove">Excluir</UiButton>
      </div>
    </div>

    <p v-else class="text-14 text-fg-muted">Esta tarefa não está mais disponível.</p>
  </UiDrawer>
</template>

<style>
.task-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-summary > li {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--ds-border);
  border-radius: 999px;
  background: var(--ds-bg-2);
  padding-inline: 10px;
  font-size: var(--text-12);
  color: var(--ds-fg-muted);
}

.task-summary-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--tone);
  box-shadow: 0 0 8px var(--tone);
}
</style>

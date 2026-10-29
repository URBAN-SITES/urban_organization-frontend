<script setup lang="ts">
import { ArrowLeft, Check, Trash2 } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { TaskGitHubLinks } from '@/modules/github'
import { TaskCharges } from '@/modules/payments'
import { UiButton, UiDrawer, UiInput, UiSelect, UiSpinner, UiTextarea } from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { useKanbanStore } from '../stores'
import type { Label, Person, Task, UpdateTaskRequest } from '../types'
import LabelChip from './labelChip.vue'
import LabelPicker from './labelPicker.vue'
import { PRIORITIES } from './priority'
import TaskAttachments from './taskAttachments.vue'
import TaskChecklist from './taskChecklist.vue'
import TaskConversation from './taskConversation.vue'
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
const parent = computed(() =>
  task.value?.parent_id ? kanban.tasks.find((row) => row.id === task.value!.parent_id) : null,
)
const form = reactive({
  title: '',
  description: '',
  status: '',
  priority: 'medium' as Task['priority'],
  assignee: '',
  due: '',
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
    due: t?.due_date ?? '',
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
  if (titleError.value || creating.value) return
  creating.value = true
  try {
    const created = await kanban.addTask({
      title: title.slice(0, 255),
      description: form.description,
      priority: form.priority,
      due_date: form.due || null,
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
        <UiSelect v-model="form.assignee" label="Responsável" :options="peopleOptions" />
        <UiInput v-model="form.due" type="date" label="Prazo" />
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
          @update:model-value="save({ assignee: $event || null })"
        />
        <UiInput
          v-model="form.due"
          type="date"
          label="Prazo"
          :disabled="readOnly"
          :hint="task.is_overdue ? 'Atrasada' : undefined"
          @change="save({ due_date: form.due || null })"
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

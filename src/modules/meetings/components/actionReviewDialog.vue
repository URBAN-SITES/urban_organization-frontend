<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
  UiBadge,
  UiButton,
  UiCheckbox,
  UiDialog,
  UiInput,
  UiSelect,
  UiTextarea,
} from '@/shared/components'
import type { UUID } from '@/shared/types'
import { createActionTasks } from '../services'
import type { ActionTaskInput, MeetingPerson, SummaryAction } from '../types'
import { clock } from '../utils'

/**
 * Revisão das ações sugeridas antes de virarem tarefas. Nada é criado sem
 * "Criar tarefas"; responsável e prazo ficam vazios quando a reunião não os disse.
 */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  meetingId: UUID
  recordingId: UUID
  actions: SummaryAction[]
  people: MeetingPerson[]
  /** só esta ação (botão "Criar tarefa" da ação); sem ele, todas as pendentes */
  only?: number | null
  meetingTitle?: string
}>()

/** A descrição leva a origem: o trecho falado e de qual reunião veio. */
function describe(action: SummaryAction): string {
  const origin = [
    `> “${action.source.quote}” (${clock(action.source.start)})`,
    props.meetingTitle ? `Ação definida na reunião **${props.meetingTitle}**.` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  return [action.description?.trim(), origin].filter(Boolean).join('\n\n')
}
const emit = defineEmits<{ created: [] }>()

interface Draft extends ActionTaskInput {
  selected: boolean
  action: SummaryAction
}

const drafts = ref<Draft[]>([])
const saving = ref(false)

watch(open, (value) => {
  if (!value) return
  drafts.value = props.actions
    .map((action, index) => ({ action, index }))
    .filter(({ action, index }) => !action.created && (props.only == null || index === props.only))
    .map(({ action, index }) => ({
      index,
      action,
      selected: true,
      title: action.title,
      description: describe(action),
      assignee: action.assignee_id,
      due_date: action.due_date,
    }))
})

const options = () => [
  { value: '', label: 'Sem responsável' },
  ...props.people.map((person) => ({ value: person.id, label: person.name })),
]

async function save() {
  const items = drafts.value
    .filter((draft) => draft.selected && draft.title.trim())
    .map(({ index, title, description, assignee, due_date }) => ({
      index,
      title: title.trim(),
      description,
      assignee: assignee || null,
      due_date: due_date || null,
    }))
  if (!items.length) return
  saving.value = true
  try {
    const result = await createActionTasks(props.meetingId, props.recordingId, items)
    const created = result.created.length
    toast.success(created === 1 ? '1 tarefa criada.' : `${created} tarefas criadas.`)
    if (result.skipped.length) toast.info('Algumas ações já tinham virado tarefa.')
    open.value = false
    emit('created')
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiDialog
    v-model:open="open"
    :title="only == null ? 'Criar tarefas a partir da reunião' : 'Criar tarefa a partir da reunião'"
    description="Revise cada ação. As tarefas só são criadas quando você confirmar."
    size="lg"
    :dismissible="!saving"
  >
    <p v-if="!drafts.length" class="text-14 text-fg-muted">
      Todas as ações sugeridas já viraram tarefas.
    </p>
    <ul v-else class="grid gap-4">
      <li
        v-for="draft in drafts"
        :key="draft.index"
        class="grid gap-3 rounded-card border border-border p-3"
      >
        <UiCheckbox
          v-model="draft.selected"
          :label="`Criar “${draft.action.title}”`"
          :description="`${clock(draft.action.source.start)}: “${draft.action.source.quote}”`"
        />
        <template v-if="draft.selected">
          <UiInput v-model="draft.title" label="Título" required />
          <UiTextarea v-model="draft.description" label="Descrição" :rows="4" />
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="grid gap-1">
              <UiSelect
                :model-value="draft.assignee ?? ''"
                label="Responsável"
                :options="options()"
                @update:model-value="draft.assignee = $event || null"
              />
              <UiBadge v-if="!draft.action.assignee_id" tone="warning" class="justify-self-start">
                {{
                  draft.action.assignee_mentioned
                    ? `“${draft.action.assignee_mentioned}” não é do projeto`
                    : 'Responsável não identificado'
                }}
              </UiBadge>
            </div>
            <div class="grid gap-1">
              <UiInput
                :model-value="draft.due_date ?? ''"
                type="date"
                label="Prazo"
                @update:model-value="draft.due_date = $event || null"
              />
              <UiBadge v-if="!draft.action.due_date" tone="warning" class="justify-self-start">
                Prazo não identificado
              </UiBadge>
            </div>
          </div>
        </template>
      </li>
    </ul>
    <template #footer>
      <UiButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</UiButton>
      <UiButton
        variant="primary"
        :loading="saving"
        :disabled="!drafts.some((draft) => draft.selected && draft.title.trim())"
        @click="save"
      >
        Criar tarefas
      </UiButton>
    </template>
  </UiDialog>
</template>

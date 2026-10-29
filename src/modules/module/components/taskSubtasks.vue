<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiButton, UiCheckbox, UiInput } from '@/shared/components'
import { useKanbanStore } from '../stores'
import type { Task } from '../types'

/** Subtarefas: tarefas do mesmo projeto com esta como mãe. Marcar = mover para "concluído". */
const props = defineProps<{ task: Task; canEdit: boolean }>()
const emit = defineEmits<{ open: [taskId: string] }>()
const kanban = useKanbanStore()

const title = ref('')
const busy = ref('')
const rows = computed(() =>
  kanban.tasks
    .filter((row) => row.parent_id === props.task.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at)),
)
const doneStatus = computed(() => kanban.statuses.find((s) => s.category === 'done'))
const todoStatus = computed(() => kanban.statuses.find((s) => s.category !== 'done'))

async function run(key: string, action: () => Promise<unknown>, failure: string) {
  if (busy.value) return false
  busy.value = key
  try {
    await action()
    // os contadores da tarefa mãe mudam no servidor
    await kanban.reload(props.task.id)
    return true
  } catch (cause) {
    toast.error(getErrorMessage(cause, failure))
    return false
  } finally {
    busy.value = ''
  }
}

async function add() {
  const value = title.value.trim()
  if (!value) return
  const ok = await run(
    'new',
    () => kanban.addTask({ title: value.slice(0, 255), parent: props.task.id }),
    'Não foi possível criar a subtarefa.',
  )
  if (ok) title.value = ''
}

function toggle(row: Task, done: boolean) {
  const target = done ? doneStatus.value : todoStatus.value
  if (target)
    void run(
      row.id,
      () => kanban.move(row.id, target.id),
      'Não foi possível atualizar a subtarefa.',
    )
}
</script>

<template>
  <section aria-labelledby="task-subtasks" class="grid gap-2">
    <h3 id="task-subtasks" class="text-13 font-semibold text-fg">
      Subtarefas
      <span v-if="rows.length" class="font-normal text-fg-muted">
        {{ rows.filter((row) => row.completed_at).length }}/{{ rows.length }}
      </span>
    </h3>
    <ul v-if="rows.length" class="grid gap-1">
      <li v-for="row in rows" :key="row.id" class="flex items-center gap-2">
        <UiCheckbox
          :model-value="!!row.completed_at"
          :disabled="!canEdit || !!busy"
          :aria-label="`Concluir ${row.title}`"
          @update:model-value="toggle(row, $event)"
        />
        <button
          type="button"
          :class="[
            'min-w-0 flex-1 cursor-pointer truncate rounded-[4px] text-left text-14 hover:underline focus-visible:outline-2 focus-visible:outline-accent',
            row.completed_at ? 'text-fg-muted line-through' : 'text-fg',
          ]"
          @click="emit('open', row.id)"
        >
          {{ row.title }}
        </button>
      </li>
    </ul>
    <p v-else-if="!canEdit" class="text-13 text-fg-muted">Nenhuma subtarefa.</p>
    <form v-if="canEdit" class="flex gap-2" @submit.prevent="add">
      <UiInput
        v-model="title"
        placeholder="Nova subtarefa"
        aria-label="Nova subtarefa"
        maxlength="255"
        class="flex-1"
      />
      <UiButton type="submit" :icon="Plus" :loading="busy === 'new'" :disabled="!title.trim()">
        Adicionar
      </UiButton>
    </form>
  </section>
</template>

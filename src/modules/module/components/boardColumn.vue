<script setup lang="ts">
import { CircleCheck, CircleDashed, CircleDot, Plus } from '@lucide/vue'
import { computed, ref } from 'vue'
import { UiIconButton, type MenuItem } from '@/shared/components'
import type { Status, Task } from '../types'
import BoardCard from './boardCard.vue'

const props = defineProps<{
  status: Status
  tasks: Task[]
  canEdit: boolean
  /** itens "Mover para…" de cada cartão (alternativa de teclado ao arrastar) */
  moveItems: (task: Task) => MenuItem[]
}>()
const emit = defineEmits<{
  add: []
  open: [taskId: string]
  drop: [taskId: string, position: number]
}>()

const ICONS = { todo: CircleDashed, in_progress: CircleDot, done: CircleCheck } as const
const over = ref(false)
const dragging = ref('')
const full = computed(
  () => !!props.status.wip_limit && props.tasks.length >= props.status.wip_limit,
)

function dragStart(event: DragEvent, task: Task) {
  event.dataTransfer?.setData('text/plain', task.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  dragging.value = task.id
}

function drop(event: DragEvent, position = props.tasks.length) {
  over.value = false
  const id = event.dataTransfer?.getData('text/plain')
  if (id && props.canEdit) emit('drop', id, position)
}
</script>

<template>
  <section
    :aria-label="`${status.name}, ${tasks.length} ${tasks.length === 1 ? 'tarefa' : 'tarefas'}`"
    :class="[
      'flex w-72 shrink-0 flex-col rounded-card border bg-surface-2/60 transition-colors duration-(--dur-fast) ease-out sm:w-80',
      over ? 'border-border-strong bg-surface-2' : 'border-transparent',
    ]"
    @dragover.prevent="over = canEdit"
    @dragleave.self="over = false"
    @drop.prevent="drop($event)"
  >
    <header class="flex h-11 items-center gap-2 px-3">
      <component
        :is="ICONS[status.category]"
        :size="16"
        :class="status.category === 'done' ? 'text-success' : 'text-fg-muted'"
        :style="status.color ? { color: status.color } : undefined"
        aria-hidden="true"
      />
      <h3 class="truncate text-13 font-semibold text-fg">{{ status.name }}</h3>
      <span
        :class="[
          'font-mono text-12 tabular-nums',
          full ? 'font-medium text-danger' : 'text-fg-muted',
        ]"
        :title="status.wip_limit ? 'Tarefas / limite da coluna' : undefined"
      >
        {{ tasks.length }}<template v-if="status.wip_limit">/{{ status.wip_limit }}</template>
      </span>
      <UiIconButton
        v-if="canEdit"
        :icon="Plus"
        size="sm"
        :label="`Nova tarefa em ${status.name}`"
        class="ml-auto"
        @click="emit('add')"
      />
    </header>

    <ul class="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
      <li
        v-for="(task, index) in tasks"
        :key="task.id"
        :class="dragging === task.id ? 'opacity-40' : ''"
        @dragstart="dragStart($event, task)"
        @dragend="dragging = ''"
        @dragover.prevent.stop="over = canEdit"
        @drop.prevent.stop="drop($event, index)"
      >
        <BoardCard
          :task="task"
          :draggable="canEdit"
          :move-items="moveItems(task)"
          @open="emit('open', task.id)"
        />
      </li>
      <li
        v-if="!tasks.length"
        class="rounded-card border border-dashed border-border px-3 py-6 text-center text-12 text-fg-muted"
      >
        {{ canEdit ? 'Arraste uma tarefa para cá ou crie uma nova.' : 'Nenhuma tarefa.' }}
      </li>
    </ul>
  </section>
</template>

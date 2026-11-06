<script setup lang="ts">
import { CalendarClock, ChevronDown } from '@lucide/vue'
import { ref } from 'vue'
import { UiAvatar, UiCheckbox } from '@/shared/components'
import type { Status, Task } from '../types'
import LabelChip from './labelChip.vue'
import { PRIORITY_TEXT, priorityOf, shortDate } from './priority'

/** Lista agrupada por status (as mesmas tarefas e filtros do quadro). */
const props = defineProps<{
  statuses: Status[]
  tasksOf: (statusId: string) => Task[]
  /** caixas de seleção para editar várias de uma vez */
  selectable?: boolean
}>()
const emit = defineEmits<{ open: [taskId: string] }>()
const selected = defineModel<string[]>('selected', { default: () => [] })

function pick(id: string, on: boolean) {
  selected.value = on ? [...selected.value, id] : selected.value.filter((value) => value !== id)
}
function pickAll(statusId: string, on: boolean) {
  const ids = props.tasksOf(statusId).map((task) => task.id)
  const rest = selected.value.filter((id) => !ids.includes(id))
  selected.value = on ? [...rest, ...ids] : rest
}
const allOf = (statusId: string) => {
  const ids = props.tasksOf(statusId).map((task) => task.id)
  const count = ids.filter((id) => selected.value.includes(id)).length
  return { all: !!ids.length && count === ids.length, some: count > 0 && count < ids.length }
}
const collapsed = ref<string[]>([])

function toggle(id: string) {
  collapsed.value = collapsed.value.includes(id)
    ? collapsed.value.filter((value) => value !== id)
    : [...collapsed.value, id]
}
</script>

<template>
  <div class="grid gap-4">
    <section
      v-for="status in statuses"
      :key="status.id"
      :aria-labelledby="`list-${status.id}`"
      class="uo-card"
    >
      <h3 :id="`list-${status.id}`" class="flex items-center">
        <span v-if="selectable && tasksOf(status.id).length" class="pl-4">
          <UiCheckbox
            :model-value="allOf(status.id).all"
            :indeterminate="allOf(status.id).some"
            :aria-label="`Selecionar todas de ${status.name}`"
            @update:model-value="pickAll(status.id, $event)"
          />
        </span>
        <button
          type="button"
          :aria-expanded="!collapsed.includes(status.id)"
          class="flex h-11 w-full cursor-pointer items-center gap-2 px-4 text-left text-13 font-semibold text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
          @click="toggle(status.id)"
        >
          <ChevronDown
            :size="16"
            aria-hidden="true"
            :class="[
              'text-fg-muted transition-transform duration-(--dur-fast) ease-out',
              collapsed.includes(status.id) ? '-rotate-90' : '',
            ]"
          />
          {{ status.name }}
          <span class="font-mono font-normal text-fg-muted tabular-nums">
            {{ tasksOf(status.id).length }}
          </span>
        </button>
      </h3>
      <ul
        v-if="!collapsed.includes(status.id)"
        class="divide-y divide-border border-t border-border"
      >
        <li
          v-for="task in tasksOf(status.id)"
          :key="task.id"
          :class="[
            'relative flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-surface-2',
            selected.includes(task.id) ? 'bg-surface-2' : '',
          ]"
        >
          <span v-if="selectable" class="relative z-10">
            <UiCheckbox
              :model-value="selected.includes(task.id)"
              :aria-label="`Selecionar ${task.title}`"
              @update:model-value="pick(task.id, $event)"
            />
          </span>
          <component
            :is="priorityOf(task.priority).icon"
            :size="16"
            :class="PRIORITY_TEXT[priorityOf(task.priority).tone]"
            :aria-label="`Prioridade ${priorityOf(task.priority).label}`"
            role="img"
          />
          <a
            href="#"
            :class="[
              'min-w-0 flex-1 truncate rounded-[4px] text-14 after:absolute after:inset-0 after:content-[\'\'] focus-visible:outline-2 focus-visible:outline-accent',
              task.completed_at ? 'text-fg-muted line-through' : 'text-fg',
            ]"
            @click.prevent="emit('open', task.id)"
          >
            {{ task.title }}
          </a>
          <span class="hidden gap-1 md:flex">
            <LabelChip v-for="label in task.labels.slice(0, 3)" :key="label.id" :label="label" />
          </span>
          <span
            v-if="task.due_date"
            :class="[
              'inline-flex w-20 items-center gap-1 text-12',
              task.is_overdue ? 'font-medium text-danger' : 'text-fg-muted',
            ]"
          >
            <CalendarClock :size="14" aria-hidden="true" />
            {{ shortDate(task.due_date) }}
          </span>
          <span v-else class="hidden w-20 sm:block" aria-hidden="true" />
          <UiAvatar
            v-if="task.assignee_name"
            :name="task.assignee_name"
            size="xs"
            :title="task.assignee_name"
          />
          <span v-else class="size-5" aria-hidden="true" />
        </li>
        <li v-if="!tasksOf(status.id).length" class="px-4 py-3 text-13 text-fg-muted">
          Nenhuma tarefa neste status.
        </li>
      </ul>
    </section>
  </div>
</template>

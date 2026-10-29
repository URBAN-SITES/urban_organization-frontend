<script setup lang="ts">
import { CalendarClock, ChevronDown } from '@lucide/vue'
import { ref } from 'vue'
import { UiAvatar } from '@/shared/components'
import type { Status, Task } from '../types'
import LabelChip from './labelChip.vue'
import { PRIORITY_TEXT, priorityOf, shortDate } from './priority'

/** Lista agrupada por status (as mesmas tarefas e filtros do quadro). */
defineProps<{ statuses: Status[]; tasksOf: (statusId: string) => Task[] }>()
const emit = defineEmits<{ open: [taskId: string] }>()
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
      class="rounded-card border border-border bg-surface-1"
    >
      <h3 :id="`list-${status.id}`">
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
          class="relative flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-surface-2"
        >
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

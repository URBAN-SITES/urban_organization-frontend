<script setup lang="ts">
import { CalendarClock, CheckSquare, GitBranch, MessageSquare, MoreHorizontal } from '@lucide/vue'
import { computed } from 'vue'
import { UiAvatar, UiIconButton, UiMenu, type MenuItem } from '@/shared/components'
import type { Task } from '../types'
import LabelChip from './labelChip.vue'
import { PRIORITY_TEXT, priorityOf, shortDate } from './priority'

/** Cartão do quadro. Arrasta com o mouse; pelo teclado, "Mover para" no menu de ações. */
const props = defineProps<{ task: Task; draggable: boolean; moveItems: MenuItem[] }>()
defineEmits<{ open: [] }>()

const priority = computed(() => priorityOf(props.task.priority))
</script>

<template>
  <article
    :draggable="draggable"
    :data-task="task.id"
    class="group relative grid gap-2 rounded-card border border-border bg-surface-1 p-3 transition-[border-color,transform] duration-(--dur-fast) ease-out hover:border-border-strong has-[a:focus-visible]:border-border-strong"
  >
    <div v-if="task.labels.length" class="flex flex-wrap gap-1">
      <LabelChip v-for="label in task.labels" :key="label.id" :label="label" />
    </div>

    <h4 class="pr-7 text-14 leading-5 font-medium break-words text-fg">
      <a
        href="#"
        :class="[
          'rounded-[4px] after:absolute after:inset-0 after:content-[\'\'] focus-visible:outline-2 focus-visible:outline-accent',
          task.completed_at ? 'text-fg-muted line-through' : '',
        ]"
        @click.prevent="$emit('open')"
      >
        {{ task.title }}
      </a>
    </h4>

    <UiMenu
      v-if="moveItems.length"
      :items="moveItems"
      :label="`Ações de ${task.title}`"
      placement="bottom-end"
      class="absolute top-2 right-2 z-10"
    >
      <template #trigger="{ props: trigger }">
        <UiIconButton
          v-bind="trigger"
          :icon="MoreHorizontal"
          size="sm"
          :label="`Ações de ${task.title}`"
          class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 pointer-coarse:opacity-100"
        />
      </template>
    </UiMenu>

    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-12 text-fg-muted">
      <span :class="['inline-flex items-center gap-1', PRIORITY_TEXT[priority.tone]]">
        <component :is="priority.icon" :size="14" aria-hidden="true" />
        {{ priority.label }}
      </span>
      <span
        v-if="task.due_date"
        :class="[
          'inline-flex items-center gap-1',
          task.is_overdue ? 'font-medium text-danger' : '',
        ]"
      >
        <CalendarClock :size="14" aria-hidden="true" />
        <span class="sr-only">{{ task.is_overdue ? 'Atrasada, prazo' : 'Prazo' }}</span>
        {{ shortDate(task.due_date) }}
      </span>
      <span v-if="task.subtask_total" class="inline-flex items-center gap-1">
        <GitBranch :size="14" aria-hidden="true" />
        <span class="sr-only">Subtarefas</span>
        {{ task.subtask_done }}/{{ task.subtask_total }}
      </span>
      <span v-if="task.checklist_total" class="inline-flex items-center gap-1">
        <CheckSquare :size="14" aria-hidden="true" />
        <span class="sr-only">Checklist</span>
        {{ task.checklist_done }}/{{ task.checklist_total }}
      </span>
      <span v-if="task.comment_count" class="inline-flex items-center gap-1">
        <MessageSquare :size="14" aria-hidden="true" />
        <span class="sr-only">Comentários</span>
        {{ task.comment_count }}
      </span>
      <UiAvatar
        v-if="task.assignee_name"
        :name="task.assignee_name"
        size="xs"
        class="ml-auto"
        :title="task.assignee_name"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { CalendarClock, Check, GitBranch, MessageSquare, MoreHorizontal } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { UiAvatar, UiIconButton, UiMenu, type MenuItem } from '@/shared/components'
import type { Task } from '../types'
import LabelChip from './labelChip.vue'
import { PRIORITY_TEXT, priorityOf, shortDate } from './priority'

/** Cartão do quadro. Arrasta com o mouse; pelo teclado, "Mover para" no menu de ações. */
const props = defineProps<{ task: Task; draggable: boolean; moveItems: MenuItem[] }>()
defineEmits<{ open: [] }>()

const LABELS_SHOWN = 3
const priority = computed(() => priorityOf(props.task.priority))
// subtarefas e checklist somados viram uma barra de progresso
const steps = computed(() => ({
  done: props.task.subtask_done + props.task.checklist_done,
  total: props.task.subtask_total + props.task.checklist_total,
}))

// ao ser concluída, o cartão dá um retorno rápido de sucesso
const justDone = ref(false)
watch(
  () => props.task.completed_at,
  (now, before) => {
    if (!now || before) return
    justDone.value = true
    setTimeout(() => (justDone.value = false), 1200)
  },
)
</script>

<template>
  <article
    :draggable="draggable"
    :data-task="task.id"
    :data-priority="task.priority"
    :class="['board-card group', { 'is-done': task.completed_at, 'just-done': justDone }]"
  >
    <div v-if="task.labels.length" class="flex flex-wrap gap-1 pr-7">
      <LabelChip
        v-for="label in task.labels.slice(0, LABELS_SHOWN)"
        :key="label.id"
        :label="label"
      />
      <span
        v-if="task.labels.length > LABELS_SHOWN"
        class="inline-flex h-5 items-center rounded-full bg-surface-2 px-1.5 text-12 text-fg-muted"
      >
        +{{ task.labels.length - LABELS_SHOWN }}
      </span>
    </div>

    <h4 class="pr-7 text-14 leading-5 font-medium break-words text-fg">
      <a
        href="#"
        :class="[
          'rounded-[4px] after:absolute after:inset-0 after:content-[\'\'] focus-visible:outline-2 focus-visible:outline-accent',
          task.completed_at ? 'text-fg-muted line-through decoration-fg-muted/60' : '',
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

    <div v-if="steps.total" class="flex items-center gap-2">
      <span class="uo-meter flex-1" aria-hidden="true">
        <span
          :style="{
            width: `${(steps.done * 100) / steps.total}%`,
            '--meter': steps.done === steps.total ? 'var(--ds-success)' : 'var(--ds-accent)',
          }"
        />
      </span>
      <span class="font-mono text-12 text-fg-muted">{{ steps.done }}/{{ steps.total }}</span>
    </div>

    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-12 text-fg-muted">
      <span
        v-if="task.priority !== 'medium'"
        :class="['inline-flex items-center gap-1', PRIORITY_TEXT[priority.tone]]"
      >
        <component :is="priority.icon" :size="14" aria-hidden="true" />
        {{ priority.label }}
      </span>
      <span
        v-if="task.due_date"
        :class="[
          'inline-flex items-center gap-1',
          task.is_overdue && !task.completed_at ? 'board-due-late' : '',
        ]"
      >
        <CalendarClock :size="14" aria-hidden="true" />
        <span class="sr-only">{{ task.is_overdue ? 'Atrasada, prazo' : 'Prazo' }}</span>
        {{ shortDate(task.due_date) }}
      </span>
      <span v-if="task.subtask_total" class="inline-flex items-center gap-1">
        <GitBranch :size="14" aria-hidden="true" />
        <span class="sr-only">Subtarefas {{ task.subtask_done }} de {{ task.subtask_total }}</span>
        <span aria-hidden="true">{{ task.subtask_total }}</span>
      </span>
      <span v-if="task.checklist_total" class="sr-only">
        Checklist {{ task.checklist_done }} de {{ task.checklist_total }}
      </span>
      <span v-if="task.comment_count" class="inline-flex items-center gap-1">
        <MessageSquare :size="14" aria-hidden="true" />
        <span class="sr-only">Comentários</span>
        {{ task.comment_count }}
      </span>
      <span v-if="task.completed_at" class="inline-flex items-center gap-1 text-success">
        <Check :size="14" aria-hidden="true" /> Concluída
      </span>
      <UiAvatar
        v-if="task.assignee_name"
        :name="task.assignee_name"
        size="xs"
        class="ml-auto ring-2 ring-surface-1"
        :title="task.assignee_name"
      />
    </div>
  </article>
</template>

<style>
.board-card {
  position: relative;
  display: grid;
  gap: 10px;
  overflow: hidden;
  border: 1px solid var(--ds-border);
  border-radius: 10px;
  background: linear-gradient(180deg, var(--ds-card-sheen), transparent 50%), var(--ds-surface-1);
  padding: 12px 12px 12px 14px;
  box-shadow: var(--shadow-card);
  transition:
    border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}

.board-card[draggable='true'] {
  cursor: grab;
}

.board-card[draggable='true']:active {
  cursor: grabbing;
}

.board-card:hover,
.board-card:has(a:focus-visible) {
  border-color: var(--ds-border-strong);
  box-shadow: var(--shadow-lift);
  transform: translateY(calc(-1px * var(--motion-on)));
}

/* faixa lateral só nas prioridades que pedem atenção */
.board-card::before {
  position: absolute;
  inset: 10px auto 10px 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  content: '';
  background: transparent;
}

.board-card[data-priority='high']::before {
  background: var(--ds-warning);
}

.board-card[data-priority='urgent']::before {
  background: var(--ds-danger);
  box-shadow: 0 0 10px var(--ds-danger);
}

.board-card.is-done {
  background: var(--ds-bg-2);
}

.board-card.just-done {
  animation: board-done 1.1s var(--ease-out);
}

@keyframes board-done {
  0% {
    box-shadow:
      0 0 0 0 rgb(76 195 138 / 0.55),
      var(--shadow-card);
  }
  100% {
    box-shadow:
      0 0 0 10px rgb(76 195 138 / 0),
      var(--shadow-card);
  }
}

.board-due-late {
  border-radius: 999px;
  background: var(--ds-danger-soft);
  padding: 0 6px;
  font-weight: 500;
  color: var(--ds-danger);
}

@media (prefers-reduced-motion: reduce) {
  .board-card.just-done {
    animation: none;
  }
}
</style>

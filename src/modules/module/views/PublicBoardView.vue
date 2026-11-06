<script setup lang="ts">
import { CalendarDays, CircleCheck, Eye } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { BrandLogo, UiEmptyState, UiSkeleton } from '@/shared/components'
import ProjectIcon from '../components/projectIcon.vue'
import { PRIORITIES, shortDate } from '../components/priority'
import { getPublicBoard } from '../services'
import type { PublicBoard } from '../types'

/** Quadro aberto por um link público: só leitura, sem conta e sem dados de pessoas. */
const props = defineProps<{ token: string }>()

const board = ref<PublicBoard | null>(null)
const failed = ref(false)

watch(
  () => props.token,
  async (token) => {
    board.value = null
    failed.value = false
    try {
      board.value = await getPublicBoard(token)
      document.title = `${board.value.name} · ${board.value.organization}`
    } catch {
      failed.value = true
    }
  },
  { immediate: true },
)

const columns = computed(() =>
  (board.value?.statuses ?? []).map((status) => ({
    ...status,
    tasks: (board.value?.tasks ?? []).filter((task) => task.status_id === status.id),
  })),
)
const done = computed(() => board.value?.tasks.filter((task) => task.completed).length ?? 0)
const priorityLabel = (value: string) => PRIORITIES.find((p) => p.value === value)?.label
</script>

<template>
  <div class="dark flex min-h-dvh flex-col bg-bg text-fg">
    <header class="border-b border-border">
      <div class="pb-wrap flex flex-wrap items-center justify-between gap-3 py-4">
        <BrandLogo on="dark" class="w-28" />
        <span class="flex items-center gap-1.5 text-12 text-fg-muted">
          <Eye :size="14" aria-hidden="true" /> Visualização pública, somente leitura
        </span>
      </div>
    </header>

    <main class="pb-wrap flex flex-1 flex-col gap-6 py-6">
      <div v-if="!board && !failed" class="grid gap-3">
        <UiSkeleton class="h-10 w-72" />
        <div class="flex gap-3">
          <UiSkeleton v-for="n in 3" :key="n" class="h-64 w-72 rounded-card" />
        </div>
      </div>

      <UiEmptyState
        v-else-if="failed"
        :icon="Eye"
        title="Este link não está disponível"
        description="Ele pode ter sido desligado por quem gerencia o projeto. Peça um link novo."
      />

      <template v-else-if="board">
        <div class="flex items-center gap-3">
          <span
            class="grid size-11 shrink-0 place-items-center rounded-xl"
            :style="{ background: board.color || '#f99f11' }"
          >
            <ProjectIcon :icon="board.icon" color="#ffffff" size="md" />
          </span>
          <div class="min-w-0">
            <h1 class="truncate text-20 font-semibold">{{ board.name }}</h1>
            <p class="text-13 text-fg-muted">
              {{ board.organization }} · {{ done }} de {{ board.tasks.length }} tarefas concluídas
            </p>
          </div>
        </div>
        <p v-if="board.description" class="max-w-2xl text-14 text-fg-muted">
          {{ board.description }}
        </p>

        <div class="pb-columns">
          <section
            v-for="column in columns"
            :key="column.id"
            class="pb-column"
            :aria-label="column.name"
          >
            <h2 class="flex items-center justify-between gap-2 px-1 text-14 font-semibold">
              {{ column.name }}
              <span class="font-mono text-12 font-normal text-fg-muted">
                {{ column.tasks.length }}
              </span>
            </h2>
            <ul class="grid gap-2">
              <li v-for="task in column.tasks" :key="task.id" class="pb-card">
                <span v-if="task.key" class="font-mono text-12 text-fg-muted">{{ task.key }}</span>
                <p
                  class="text-14 font-medium"
                  :class="task.completed ? 'text-fg-muted line-through' : 'text-fg'"
                >
                  {{ task.title }}
                </p>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-12 text-fg-muted">
                  <span v-if="task.completed" class="flex items-center gap-1 text-success">
                    <CircleCheck :size="13" aria-hidden="true" /> Concluída
                  </span>
                  <span v-if="task.due_date" class="flex items-center gap-1">
                    <CalendarDays :size="13" aria-hidden="true" /> {{ shortDate(task.due_date) }}
                  </span>
                  <span v-if="task.priority !== 'medium'">{{ priorityLabel(task.priority) }}</span>
                  <span v-if="task.estimate" class="font-mono">{{ task.estimate }} pts</span>
                </div>
                <ul v-if="task.labels.length" class="flex flex-wrap gap-1">
                  <li
                    v-for="label in task.labels"
                    :key="label.name"
                    class="pb-label"
                    :style="{ '--label': label.color || 'var(--ds-border-strong)' }"
                  >
                    {{ label.name }}
                  </li>
                </ul>
              </li>
            </ul>
            <p v-if="!column.tasks.length" class="px-1 text-12 text-fg-muted">Nenhuma tarefa.</p>
          </section>
        </div>
      </template>
    </main>
  </div>
</template>

<style>
.pb-wrap {
  width: 100%;
  max-width: 1400px;
  margin-inline: auto;
  padding-inline: 16px;
}

@media (width >= 48rem) {
  .pb-wrap {
    padding-inline: 32px;
  }
}

.pb-columns {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.pb-column {
  display: grid;
  width: 290px;
  flex-shrink: 0;
  align-content: start;
  gap: 10px;
  border: 1px solid var(--ds-border);
  border-radius: var(--radius-card);
  background: var(--ds-surface-1);
  padding: 12px;
}

.pb-card {
  display: grid;
  gap: 6px;
  border: 1px solid var(--ds-border);
  border-radius: 10px;
  background: var(--ds-surface-2);
  padding: 10px 12px;
}

.pb-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-12);
  color: var(--ds-fg-muted);
}

.pb-label::before {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  content: '';
  background: var(--label);
}
</style>

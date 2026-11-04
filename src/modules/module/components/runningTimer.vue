<script setup lang="ts">
import { Square, Timer } from '@lucide/vue'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { useAuthStore } from '@/modules/auth'
import { UiIconButton } from '@/shared/components'
import { useTimerStore } from '../stores/timer'
import { clock, formatMinutes } from '../utils/duration'

/** Cronômetro ligado aparece em qualquer tela, com atalho para a tarefa e para parar. */
const timer = useTimerStore()
const auth = useAuthStore()
const busy = ref(false)

watch(
  () => auth.user?.id,
  (id) => {
    if (id) void timer.refresh().catch(() => undefined)
  },
  { immediate: true },
)

async function stop() {
  if (busy.value) return
  busy.value = true
  try {
    const stopped = await timer.stop()
    if (stopped) toast.success(`${formatMinutes(stopped.minutes)} registrados.`)
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível parar o cronômetro.'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Transition name="ui-pop">
    <div v-if="timer.running" class="run-timer" role="status">
      <Timer :size="15" class="shrink-0 text-accent" aria-hidden="true" />
      <RouterLink
        :to="{
          path: `/setores/${timer.running.sector_id}`,
          query: { task: timer.running.task_id },
        }"
        class="run-timer-link"
        :title="timer.running.task_title"
      >
        <span class="min-w-0 truncate">{{ timer.running.task_title }}</span>
        <span class="shrink-0 font-mono text-fg">
          {{ clock(timer.running.started_at, timer.now) }}
        </span>
      </RouterLink>
      <UiIconButton
        :icon="Square"
        size="sm"
        label="Parar o cronômetro"
        :disabled="busy"
        @click="stop"
      />
    </div>
  </Transition>
</template>

<style>
.run-timer {
  position: fixed;
  right: 16px;
  bottom: calc(16px + 3.5rem + env(safe-area-inset-bottom));
  z-index: 35;
  display: flex;
  max-width: min(320px, calc(100vw - 32px));
  align-items: center;
  gap: 8px;
  border: 1px solid var(--ds-border-strong);
  border-radius: 999px;
  background: var(--ds-surface-1);
  padding: 4px 4px 4px 12px;
  box-shadow: var(--shadow-float);
}

.run-timer-link {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  font-size: var(--text-13);
  color: var(--ds-fg-muted);
}

.run-timer-link:hover {
  color: var(--ds-fg);
}

.run-timer-link:focus-visible {
  border-radius: 6px;
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}

@media (width >= 48rem) {
  .run-timer {
    bottom: 16px;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'

/** Barra de progresso. Sem `value` ela fica indeterminada. */
const {
  value,
  max = 100,
  label,
  tone = 'accent',
} = defineProps<{ value?: number; max?: number; label: string; tone?: 'accent' | 'neutral' }>()
const ratio = computed(() =>
  value === undefined ? undefined : Math.min(Math.max(value / max, 0), 1),
)
</script>

<template>
  <div
    role="progressbar"
    :aria-label="label"
    :aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="value"
    class="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
  >
    <div
      v-if="ratio !== undefined"
      :class="[
        'h-full origin-left rounded-full transition-transform',
        tone === 'neutral' ? 'bg-fg' : 'bg-accent',
      ]"
      class="duration-(--dur-slow) ease-out"
      :style="{ transform: `scaleX(${ratio})` }"
    />
    <div
      v-else
      class="motion-keep ui-progress-indeterminate absolute inset-y-0 w-1/3 rounded-full bg-accent"
    />
  </div>
</template>

<style scoped>
.ui-progress-indeterminate {
  animation: ui-progress 1.2s var(--ease-in-out) infinite;
}

@keyframes ui-progress {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(300%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-progress-indeterminate {
    animation: none;
    width: 100%;
    opacity: 0.4;
  }
}
</style>

<script setup lang="ts">
/** Rótulo curto de estado. Cores com significado, nunca decorativas. */
const { tone = 'neutral' } = defineProps<{
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
}>()

const TONES = {
  neutral: 'bg-surface-2 text-fg-muted border-border',
  accent: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
} as const
</script>

<template>
  <span
    :class="[
      'inline-flex h-5 shrink-0 items-center gap-1 rounded-[4px] border px-1.5 text-12 font-medium whitespace-nowrap',
      TONES[tone],
    ]"
  >
    <slot />
  </span>
</template>

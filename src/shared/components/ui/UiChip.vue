<script setup lang="ts">
import { Check } from '@lucide/vue'

/** Opção liga/desliga em forma de pílula (filtros, escolhas múltiplas). */
const { pressed = false, disabled = false } = defineProps<{
  pressed?: boolean
  disabled?: boolean
}>()
</script>

<template>
  <button
    data-ui="chip"
    type="button"
    :aria-pressed="pressed"
    :disabled="disabled"
    :class="[
      'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-13 select-none',
      'transition-[background-color,border-color,color] duration-(--dur-fast) ease-out',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      'disabled:cursor-not-allowed disabled:opacity-50',
      pressed
        ? 'border-fg bg-fg text-bg'
        : 'border-border bg-surface-1 text-fg-muted hover:border-border-strong hover:text-fg',
    ]"
  >
    <Check v-if="pressed" :size="14" :stroke-width="2.5" aria-hidden="true" />
    <slot />
  </button>
</template>

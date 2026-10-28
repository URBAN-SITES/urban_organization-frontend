<script setup lang="ts">
import type { Component } from 'vue'
import UiIcon from './UiIcon.vue'
import UiSpinner from './UiSpinner.vue'

/** Botão só com ícone. `label` é obrigatório: vira o nome acessível e o title. */
const {
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled = false,
  pressed,
} = defineProps<{
  icon: Component
  label: string
  variant?: 'ghost' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  pressed?: boolean
}>()
</script>

<template>
  <button
    data-ui="icon-button"
    type="button"
    :aria-label="label"
    :title="label"
    :aria-pressed="pressed"
    :disabled="disabled || loading"
    :class="[
      'inline-grid shrink-0 cursor-pointer place-items-center rounded-control text-fg-muted',
      'transition-[background-color,color,scale] duration-(--dur-fast) ease-out',
      'hover:bg-surface-2 hover:text-fg not-disabled:active:scale-[0.96] not-disabled:active:duration-(--dur-instant)',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'aria-pressed:bg-accent-soft aria-pressed:text-accent',
      variant === 'secondary' ? 'border border-border bg-surface-1' : '',
      size === 'sm' ? 'size-7' : size === 'lg' ? 'size-10' : 'size-8',
    ]"
  >
    <UiSpinner v-if="loading" :size="size === 'lg' ? 20 : 16" />
    <UiIcon v-else :icon="icon" :size="size === 'lg' ? 20 : 16" />
  </button>
</template>

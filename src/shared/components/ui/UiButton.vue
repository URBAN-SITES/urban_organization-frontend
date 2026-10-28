<script setup lang="ts">
import type { Component } from 'vue'
import UiIcon from './UiIcon.vue'
import UiSpinner from './UiSpinner.vue'

/**
 * Botão do sistema. `primary` é a única ação laranja da tela.
 * Em loading o rótulo fica invisível (sem mudar a largura) e o spinner aparece por cima.
 */
const {
  variant = 'secondary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  block = false,
} = defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  type?: 'button' | 'submit' | 'reset'
  icon?: Component
  iconRight?: Component
  loading?: boolean
  disabled?: boolean
  block?: boolean
}>()

const VARIANTS = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary:
    'border border-border bg-surface-1 text-fg hover:bg-surface-2 hover:border-border-strong',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:brightness-110 dark:text-bg',
} as const

const SIZES = {
  sm: 'h-7 gap-1.5 px-2.5 text-13',
  md: 'h-8 gap-2 px-3 text-13',
  lg: 'h-10 gap-2 px-4 text-14',
  xl: 'h-11 gap-2 px-5 text-14',
} as const
</script>

<template>
  <button
    data-ui="button"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    :class="[
      'relative inline-flex shrink-0 items-center justify-center rounded-control font-medium whitespace-nowrap select-none',
      'transition-[background-color,border-color,color,scale] duration-(--dur-fast) ease-out',
      'not-disabled:active:scale-[0.98] not-disabled:active:duration-(--dur-instant)',
      'disabled:cursor-not-allowed',
      disabled && !loading ? 'opacity-50' : '',
      loading ? 'cursor-wait' : 'cursor-pointer',
      block ? 'w-full' : '',
      VARIANTS[variant],
      SIZES[size],
    ]"
  >
    <span :class="['inline-flex items-center gap-[inherit]', loading ? 'invisible' : '']">
      <UiIcon v-if="icon" :icon="icon" :size="size === 'lg' ? 16 : 14" />
      <slot />
      <UiIcon v-if="iconRight" :icon="iconRight" :size="size === 'lg' ? 16 : 14" />
    </span>
    <span v-if="loading" class="absolute inset-0 grid place-items-center">
      <UiSpinner :size="size === 'lg' ? 16 : 14" />
    </span>
  </button>
</template>

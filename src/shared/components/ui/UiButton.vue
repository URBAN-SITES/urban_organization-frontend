<script setup lang="ts">
import type { Component } from 'vue'
import UiIcon from './UiIcon.vue'
import UiSpinner from './UiSpinner.vue'

/**
 * Botão do sistema. `primary` é a única ação laranja da tela.
 * Em loading o rótulo fica invisível (sem mudar a largura) e o spinner aparece por cima.
 * Com `loadingText` o rótulo troca pelo texto de progresso ("Entrando...") ao lado do spinner.
 * Com `href` vira um link com a mesma aparência (ex.: abrir uma página externa).
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
  loadingText?: string
  disabled?: boolean
  block?: boolean
  href?: string
}>()

const VARIANTS = {
  primary:
    'bg-accent text-accent-fg not-disabled:hover:bg-accent-hover not-disabled:hover:shadow-[0_8px_22px_-10px_var(--ds-accent)]',
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
  <component
    :is="href ? 'a' : 'button'"
    data-ui="button"
    :href="href"
    :type="href ? undefined : type"
    :disabled="href ? undefined : disabled || loading"
    :aria-busy="loading || undefined"
    :class="[
      'relative inline-flex shrink-0 items-center justify-center rounded-control font-medium whitespace-nowrap select-none',
      'transition-[background-color,border-color,color,box-shadow,scale] duration-(--dur-fast) ease-out',
      'not-disabled:active:scale-[0.98] not-disabled:active:duration-(--dur-instant)',
      'disabled:cursor-not-allowed',
      disabled && !loading ? 'opacity-50' : '',
      loading ? 'cursor-wait' : 'cursor-pointer',
      block ? 'w-full' : '',
      VARIANTS[variant],
      SIZES[size],
    ]"
  >
    <span
      v-if="loading && loadingText"
      class="ui-button-swap inline-flex items-center gap-[inherit]"
    >
      <UiSpinner :size="size === 'lg' ? 16 : 14" :label="loadingText" />
      {{ loadingText }}
    </span>
    <template v-else>
      <span :class="['inline-flex items-center gap-[inherit]', loading ? 'invisible' : '']">
        <UiIcon v-if="icon" :icon="icon" :size="size === 'lg' ? 16 : 14" />
        <slot />
        <UiIcon v-if="iconRight" :icon="iconRight" :size="size === 'lg' ? 16 : 14" />
      </span>
      <span v-if="loading" class="ui-button-swap absolute inset-0 grid place-items-center">
        <UiSpinner :size="size === 'lg' ? 16 : 14" />
      </span>
    </template>
  </component>
</template>

<style>
/* o conteúdo de carregamento entra com um fade curto, sem mexer no tamanho do botão */
.ui-button-swap {
  animation: ui-button-swap var(--dur-fast) var(--ease-out);
}

@keyframes ui-button-swap {
  from {
    opacity: 0;
  }
}
</style>

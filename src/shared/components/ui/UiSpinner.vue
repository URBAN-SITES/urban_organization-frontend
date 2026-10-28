<script setup lang="ts">
/** Indicador de carregamento. Continua girando com movimento reduzido: é funcional. */
const { size = 16, label = 'Carregando' } = defineProps<{
  size?: 12 | 14 | 16 | 20 | 24
  label?: string
}>()
</script>

<template>
  <svg
    role="status"
    :aria-label="label"
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="none"
    class="motion-keep shrink-0 animate-spin [animation-duration:700ms]"
  >
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" />
    <path
      d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
</template>

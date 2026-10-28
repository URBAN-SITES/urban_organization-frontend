<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Ícone Lucide com traço e tamanho padronizados.
 * Decorativo por padrão (aria-hidden); passe `label` quando o ícone for o único conteúdo.
 */
const { size = 16, label } = defineProps<{
  icon: Component
  size?: 12 | 14 | 16 | 20 | 24
  label?: string
}>()
</script>

<template>
  <component
    :is="icon"
    :size="size"
    :stroke-width="size <= 14 ? 2 : 1.75"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label"
    :role="label ? 'img' : undefined"
    class="shrink-0"
  />
</template>

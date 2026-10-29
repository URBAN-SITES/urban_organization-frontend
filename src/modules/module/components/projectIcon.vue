<script setup lang="ts">
import { computed } from 'vue'
import { projectIcon } from '../utils/projectAppearance'

/** Bloco com o ícone do projeto na cor dele; neutro quando não há cor. */
const {
  icon = '',
  color = '',
  size = 'md',
} = defineProps<{
  icon?: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
}>()
const component = computed(() => projectIcon(icon))
const SIZES = { sm: ['size-6', 14], md: ['size-8', 16], lg: ['size-10', 20] } as const
</script>

<template>
  <span
    :class="[
      'grid shrink-0 place-items-center rounded-control border border-border bg-surface-2',
      SIZES[size][0],
      color ? '' : 'text-fg-muted',
    ]"
    :style="color ? { color } : undefined"
    aria-hidden="true"
  >
    <component :is="component" :size="SIZES[size][1]" />
  </span>
</template>

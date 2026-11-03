<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Item da barra lateral. O ícone fica sempre na mesma coluna, recolhida ou não:
 * ao recolher, só o rótulo some (fade), nada muda de lugar. O traço laranja da rota atual
 * é desenhado pela navegação (desliza de um item para o outro), não pelo item.
 */
const {
  collapsed = false,
  badge = 0,
  size = 'md',
} = defineProps<{
  to: string
  label: string
  icon: Component
  active: boolean
  collapsed?: boolean
  badge?: number
  size?: 'md' | 'lg'
}>()
</script>

<template>
  <RouterLink
    :to="to"
    :aria-current="active ? 'page' : undefined"
    :aria-label="collapsed ? (badge ? `${label}, ${badge} não lidas` : label) : undefined"
    :data-active="active || undefined"
    :class="['sb-link group', size === 'lg' ? 'h-11 text-14' : 'h-9 text-13']"
  >
    <span class="sb-link-icon" aria-hidden="true">
      <component :is="icon" :size="18" :stroke-width="1.75" class="shrink-0" />
      <span v-if="badge && collapsed" :key="badge" class="sb-dot" />
    </span>
    <span class="sidebar-label min-w-0 flex-1 truncate">{{ label }}</span>
    <span
      v-if="badge && !collapsed"
      :key="badge"
      class="sb-count sidebar-label"
      :aria-label="`${badge} não lidas`"
    >
      {{ badge > 99 ? '99+' : badge }}
    </span>
  </RouterLink>
</template>

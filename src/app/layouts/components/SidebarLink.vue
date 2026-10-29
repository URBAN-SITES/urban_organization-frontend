<script setup lang="ts">
import type { Component } from 'vue'
import { UiIcon, UiTooltip } from '@/shared/components'

/**
 * Item da barra lateral. O ícone fica sempre na mesma coluna, recolhida ou não:
 * ao recolher, só o rótulo some (fade), nada muda de lugar.
 */
const {
  collapsed = false,
  badge = 0,
  size = 'md',
} = defineProps<{
  to: string
  label: string
  icon?: Component
  /** cor do projeto: um ponto no lugar do ícone */
  color?: string | null
  active: boolean
  collapsed?: boolean
  badge?: number
  size?: 'md' | 'lg'
}>()
</script>

<template>
  <UiTooltip :text="label" placement="right" :disabled="!collapsed" class="flex">
    <RouterLink
      :to="to"
      :aria-current="active ? 'page' : undefined"
      :aria-label="collapsed ? label : undefined"
      :data-active="active || undefined"
      :class="[
        'sidebar-link group relative flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-control px-3 font-medium select-none',
        'transition-[background-color,color,scale] duration-(--dur-fast) ease-out',
        'active:scale-[0.98] active:duration-(--dur-instant)',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
        size === 'lg' ? 'h-10 text-14' : 'h-8 text-13',
        active ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2/70 hover:text-fg',
      ]"
    >
      <!-- indicador da rota atual: um traço que cresce a partir do centro -->
      <span
        v-if="active"
        class="sidebar-indicator absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
        aria-hidden="true"
      />
      <span class="relative grid size-4 shrink-0 place-items-center" aria-hidden="true">
        <UiIcon
          v-if="icon"
          :icon="icon"
          :size="16"
          :class="[
            'transition-colors duration-(--dur-fast)',
            active ? 'text-fg' : 'text-fg-muted group-hover:text-fg',
          ]"
        />
        <span
          v-else
          class="size-2 rounded-full bg-fg-muted"
          :style="color ? { backgroundColor: color } : undefined"
        />
        <span
          v-if="badge && collapsed"
          class="absolute -top-1 -right-1 size-1.5 rounded-full bg-accent ring-2 ring-surface-1"
        />
      </span>
      <span class="sidebar-label min-w-0 flex-1 truncate">{{ label }}</span>
      <span
        v-if="badge"
        class="sidebar-label rounded-full bg-surface-3 px-1.5 font-mono text-12 leading-4 text-fg tabular-nums"
        :aria-label="`${badge} não lidas`"
      >
        {{ badge > 99 ? '99+' : badge }}
      </span>
      <span v-if="badge && collapsed" class="sr-only">{{ badge }} não lidas</span>
    </RouterLink>
  </UiTooltip>
</template>

<style scoped>
.sidebar-indicator {
  animation: sidebar-indicator var(--dur-base) var(--ease-out);
}

@keyframes sidebar-indicator {
  from {
    transform: scaleY(0.3);
    opacity: 0;
  }
}
</style>

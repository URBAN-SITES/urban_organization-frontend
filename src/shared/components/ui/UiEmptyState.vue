<script setup lang="ts">
import type { Component } from 'vue'
import UiIcon from './UiIcon.vue'

/** Estado vazio: o que é esta área e qual o próximo passo (ação no slot `action`). */
defineProps<{ title: string; description?: string; icon?: Component }>()
</script>

<template>
  <div class="ui-rise flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
    <span
      v-if="icon"
      class="grid size-10 place-items-center rounded-card border border-border bg-surface-2 text-fg-muted"
    >
      <UiIcon :icon="icon" :size="20" />
    </span>
    <div class="max-w-sm">
      <p class="text-14 font-medium text-fg">{{ title }}</p>
      <p v-if="description" class="mt-1 text-13 text-fg-muted">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="mt-1"><slot name="action" /></div>
  </div>
</template>

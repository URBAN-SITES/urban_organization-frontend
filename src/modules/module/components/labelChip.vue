<script setup lang="ts">
import type { Label } from '../types'

/** Etiqueta: ponto na cor dela + nome, sobre fundo neutro. */
defineProps<{ label: Pick<Label, 'name' | 'color'> }>()
</script>

<template>
  <span
    class="inline-flex h-5 max-w-40 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 text-12 text-fg"
  >
    <span
      class="size-1.5 shrink-0 rounded-full bg-fg-muted"
      :style="label.color ? { backgroundColor: label.color } : undefined"
      aria-hidden="true"
    />
    <span class="truncate">{{ label.name }}</span>
  </span>
</template>

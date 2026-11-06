<script setup lang="ts">
import type { Label } from '../types'

/** Etiqueta: fundo na cor dela (suave) com o nome em destaque, como nas referências. */
defineProps<{ label: Pick<Label, 'name' | 'color'> }>()
</script>

<template>
  <span class="label-chip" :style="label.color ? { '--label': label.color } : undefined">
    <span class="truncate">{{ label.name }}</span>
  </span>
</template>

<style>
.label-chip {
  --label: var(--ds-fg-muted);
  display: inline-flex;
  height: 22px;
  max-width: 10rem;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--label) 35%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--label) 18%, transparent);
  padding-inline: 8px;
  font-size: var(--text-12);
  font-weight: 500;
  color: color-mix(in srgb, var(--label), var(--ds-fg) 35%);
}
</style>

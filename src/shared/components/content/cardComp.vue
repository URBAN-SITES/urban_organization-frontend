<script setup lang="ts">
import AnimatedNumber from './animatedNumber.vue'

defineProps<{
  title: string
  data: string | number
  description?: string
  /** Cor da descrição: verde para melhora, vermelho para piora. */
  tone?: 'good' | 'bad'
}>()
</script>

<template>
  <div class="grid w-full gap-1 rounded-card border border-border bg-surface-1 px-5 py-4">
    <p class="text-13 text-fg-muted">{{ title }}</p>
    <p class="text-24 leading-tight font-semibold text-fg tabular-nums">
      <AnimatedNumber :value="data" />
    </p>
    <p
      v-if="description"
      :class="[
        'text-12',
        tone === 'good' ? 'text-success' : tone === 'bad' ? 'text-danger' : 'text-fg-muted',
      ]"
    >
      <AnimatedNumber :value="description" />
    </p>
  </div>
</template>

<script setup lang="ts">
/** Título e subtítulo padrão das telas de acesso; `center` nas confirmações. */
const { align = 'start' } = defineProps<{
  title: string
  description?: string
  headingId?: string
  align?: 'start' | 'center'
}>()
</script>

<template>
  <header :class="['mb-6', align === 'center' ? 'text-center' : '']">
    <h1
      :id="headingId"
      class="text-24 leading-tight font-bold tracking-[-0.02em] text-fg sm:text-32"
    >
      {{ title }}
    </h1>
    <p v-if="description || $slots.default" class="mt-2 text-14 leading-relaxed text-fg-muted">
      <slot>{{ description }}</slot>
    </p>
  </header>
</template>

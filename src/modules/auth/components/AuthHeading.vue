<script setup lang="ts">
/** Título e subtítulo padrão das telas de acesso. */
defineProps<{ title: string; description?: string; headingId?: string }>()
</script>

<template>
  <header class="mb-8">
    <h1 :id="headingId" class="text-32 leading-tight font-semibold tracking-[-0.02em] text-fg">
      {{ title }}
    </h1>
    <p v-if="description || $slots.default" class="mt-2 text-14 text-fg-muted">
      <slot>{{ description }}</slot>
    </p>
  </header>
</template>

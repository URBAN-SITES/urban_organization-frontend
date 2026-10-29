<script setup lang="ts">
/** Título e subtítulo padrão das telas de acesso. */
defineProps<{ title: string; description?: string; headingId?: string }>()
</script>

<template>
  <header class="mb-6">
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

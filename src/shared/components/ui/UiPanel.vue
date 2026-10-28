<script setup lang="ts">
/** Bloco de conteúdo com título e ação opcional no cabeçalho (dashboards, painéis). */
defineProps<{ title: string; description?: string; headingId?: string }>()
</script>

<template>
  <section
    class="flex min-w-0 flex-col rounded-card border border-border bg-surface-1"
    :aria-labelledby="headingId"
  >
    <header class="flex min-h-12 items-center justify-between gap-3 px-4 pt-3 pb-2">
      <div class="min-w-0">
        <h2 :id="headingId" class="text-14 font-semibold text-fg">{{ title }}</h2>
        <p v-if="description" class="text-12 text-fg-muted">{{ description }}</p>
      </div>
      <slot name="action" />
    </header>
    <div class="flex min-h-0 flex-1 flex-col px-4 pb-4">
      <slot />
    </div>
  </section>
</template>

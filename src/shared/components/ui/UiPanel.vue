<script setup lang="ts">
/** Bloco de conteúdo com título e ação opcional no cabeçalho (dashboards, painéis). */
defineProps<{ title: string; description?: string; headingId?: string }>()
</script>

<template>
  <section class="uo-card flex min-w-0 flex-col" :aria-labelledby="headingId">
    <header class="flex min-h-14 items-center justify-between gap-3 px-5 pt-4 pb-2">
      <div class="min-w-0">
        <h2 :id="headingId" class="text-14 font-semibold tracking-[-0.005em] text-fg">
          {{ title }}
        </h2>
        <p v-if="description" class="text-12 text-fg-muted">{{ description }}</p>
      </div>
      <slot name="action" />
    </header>
    <div class="flex min-h-0 flex-1 flex-col px-5 pb-5">
      <slot />
    </div>
  </section>
</template>

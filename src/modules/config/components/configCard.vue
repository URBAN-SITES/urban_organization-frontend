<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <section
    class="relative flex flex-col gap-[14px] overflow-hidden rounded-card border border-border bg-surface-1 p-[18px]"
  >
    <header class="flex items-center justify-between gap-[12px]">
      <h2 class="text-16 font-semibold text-fg">{{ title }}</h2>
      <slot name="action" />
    </header>
    <slot />
  </section>
</template>

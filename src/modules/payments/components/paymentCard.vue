<script setup lang="ts">
interface Props {
  title?: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
})
</script>

<template>
  <section
    class="flex flex-col gap-[14px] rounded-card border border-border bg-surface-1 p-[18px] sm:p-[22px]"
  >
    <header v-if="title" class="flex flex-col gap-[2px] leading-normal">
      <h2 class="border-l-2 border-accent pl-[9px] text-16 font-semibold text-fg">
        {{ title }}
      </h2>
      <p v-if="description" class="text-[13px] text-fg-muted">
        {{ description }}
      </p>
    </header>

    <slot />
  </section>
</template>

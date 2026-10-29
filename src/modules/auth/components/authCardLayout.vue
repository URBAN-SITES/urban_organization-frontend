<script setup lang="ts">
import '../auth.css'

defineProps<{
  icon: string
  title: string
}>()
</script>

<template>
  <div class="flex h-dvh flex-col bg-surface-2 px-5 py-6 sm:px-14 lg:px-16">
    <div class="flex items-center justify-center py-12">
      <div
        class="w-full max-w-110 rounded-2xl border border-border bg-surface-1 p-6 text-center sm:p-10"
      >
        <span
          class="mx-auto grid size-14 place-items-center rounded-full border border-border bg-surface-2 dark:bg-black/30"
          aria-hidden="true"
        >
          <span class="material-symbols-outlined text-[22px]!">{{ icon }}</span>
        </span>

        <h1 class="mt-6 text-[24px]! font-semibold! leading-8! tracking-[-0.02em]!">
          {{ title }}
        </h1>
        <p class="mt-2 text-[16px] leading-6.5 text-fg-muted">
          <slot name="description" />
        </p>

        <div class="mt-6 text-left">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

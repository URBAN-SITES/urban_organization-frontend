<script setup lang="ts">
import '../chat.css'

// "tinted" aplica o destaque laranja do cabeçalho do assistente
withDefaults(defineProps<{ tinted?: boolean }>(), { tinted: false })
</script>

<template>
  <div class="flex min-h-0 flex-1 overflow-hidden rounded-card border border-border bg-surface-1">
    <aside
      class="hidden w-[280px] shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-2 md:flex dark:bg-black/20"
    >
      <slot name="aside" />
    </aside>

    <section class="flex min-w-0 flex-1 flex-col">
      <header
        :class="[
          'relative flex flex-wrap items-center gap-[10px] border-b border-border px-[12px] py-[12px] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-accent/35 sm:gap-[12px] sm:px-[20px] sm:py-[14px] md:flex-nowrap',
          tinted
            ? 'bg-linear-to-r from-accent/[0.06] to-transparent after:bg-accent/35'
            : 'bg-linear-to-r from-accent/[0.06] to-transparent',
        ]"
      >
        <slot name="header" />
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-[12px] py-[14px] sm:px-[20px] sm:py-[18px]">
        <slot />
      </div>

      <footer class="px-[12px] pb-[12px] sm:px-[20px] sm:pb-[20px]">
        <slot name="footer" />
      </footer>
    </section>
  </div>
</template>

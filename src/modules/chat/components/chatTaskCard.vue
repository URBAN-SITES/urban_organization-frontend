<script setup lang="ts">
import type { DemoTaskReference } from '../types'

defineProps<{ task: DemoTaskReference }>()

defineEmits<{ open: [] }>()
</script>

<template>
  <div
    class="flex w-full max-w-[420px] items-center gap-[10px] rounded-[10px] border border-border bg-surface-1 px-[12px] py-[8px] dark:bg-black/20"
  >
    <span
      class="grid size-[22px] shrink-0 place-items-center rounded-full bg-[#fff1e6] text-accent dark:bg-accent/15"
      aria-hidden="true"
    >
      <span class="material-symbols-outlined text-[14px]!">error</span>
    </span>
    <span class="flex min-w-0 flex-1 flex-col leading-normal">
      <span class="font-mono text-[10.5px] text-fg-muted">{{ task.code }} · {{ task.status }}</span>
      <span class="truncate text-[13px] font-semibold">{{ task.title }}</span>
    </span>
    <button
      type="button"
      class="h-[30px] shrink-0 cursor-pointer rounded-[8px] border border-border px-[10px] text-[12.5px] font-medium transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-fg dark:hover:bg-surface-2"
      @click="$emit('open')"
    >
      Abrir
    </button>
  </div>
</template>

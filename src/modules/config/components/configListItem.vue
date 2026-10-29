<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description: string
    // nome de um Material Symbol
    icon: string
    status?: string
    action?: string
  }>(),
  { status: '', action: '' },
)

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex items-center gap-[12px] border-b border-border py-[10px] last:border-b-0">
    <span
      class="grid size-[32px] shrink-0 place-items-center rounded-[9px] bg-accent/10 text-accent dark:bg-accent/15"
      aria-hidden="true"
    >
      <span class="material-symbols-outlined text-[16px]!">
        {{ icon }}
      </span>
    </span>

    <div class="flex min-w-0 flex-1 flex-col gap-[2px] leading-normal">
      <p class="text-[13.5px] font-medium">{{ title }}</p>
      <p class="text-[12px] text-fg-muted">{{ description }}</p>
    </div>

    <slot>
      <span
        v-if="status"
        class="rounded-full bg-[#e4f4ea] px-[9px] py-[3px] text-[11.5px] leading-normal font-medium text-[#127a3e] dark:bg-[#127a3e]/25 dark:text-[#7ed9a2]"
      >
        {{ status }}
      </span>
      <button
        v-else-if="action"
        type="button"
        class="cursor-pointer rounded-full bg-surface-2 px-[9px] py-[3px] text-[11.5px] leading-normal font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-black/30 dark:hover:bg-surface-2"
        @click="$emit('action')"
      >
        {{ action }}
      </button>
    </slot>
  </div>
</template>

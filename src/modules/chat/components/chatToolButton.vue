<script setup lang="ts">
defineProps<{ icon: string; label: string }>()
</script>

<template>
  <button
    type="button"
    class="grid size-[28px] cursor-pointer place-items-center rounded-[7px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg dark:hover:bg-surface-2"
    :aria-label="label"
    :title="label"
  >
    <span class="material-symbols-outlined text-[18px]!" aria-hidden="true">{{ icon }}</span>
  </button>
</template>

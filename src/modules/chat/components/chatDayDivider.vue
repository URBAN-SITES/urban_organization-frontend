<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <div class="my-[14px] flex items-center gap-[12px]" role="separator" :aria-label="label">
    <span class="h-px flex-1 bg-border"></span>
    <span class="font-mono text-[10.5px] leading-normal tracking-[0.12em] text-fg-muted uppercase">
      {{ label }}
    </span>
    <span class="h-px flex-1 bg-border"></span>
  </div>
</template>

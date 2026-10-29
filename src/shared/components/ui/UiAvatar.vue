<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/** Foto do usuário com iniciais como alternativa (imagem ausente ou quebrada). */
const {
  name,
  src,
  size = 'md',
} = defineProps<{
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>()
const failed = ref(false)
watch(
  () => src,
  () => (failed.value = false),
)

const initials = computed(() => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters =
    parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
})

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-12',
  lg: 'size-10 text-14',
} as const
</script>

<template>
  <span
    :class="[
      'inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-3 font-medium text-fg select-none',
      SIZES[size],
    ]"
  >
    <img
      v-if="src && !failed"
      :src="src"
      :alt="name"
      class="size-full object-cover"
      loading="lazy"
      @error="failed = true"
    />
    <span v-else role="img" :aria-label="name">{{ initials }}</span>
  </span>
</template>

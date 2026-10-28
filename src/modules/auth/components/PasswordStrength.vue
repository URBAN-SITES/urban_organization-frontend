<script setup lang="ts">
import { computed } from 'vue'
import { passwordStrength } from '../utils'

const LABELS = ['Força da senha', 'Fraca', 'Razoável', 'Boa', 'Forte']

const props = defineProps<{ password: string }>()
const strength = computed(() => passwordStrength(props.password))
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
      <span
        v-for="bar in 4"
        :key="bar"
        :class="[
          'h-1 rounded-full transition-colors duration-(--dur-base) ease-out',
          bar <= strength ? (strength >= 3 ? 'bg-success' : 'bg-warning') : 'bg-surface-3',
        ]"
      />
    </div>
    <span class="w-24 text-right text-12 text-fg-muted" aria-live="polite">
      {{ LABELS[strength] }}
    </span>
  </div>
</template>

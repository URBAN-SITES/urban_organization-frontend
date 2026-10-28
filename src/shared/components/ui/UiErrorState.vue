<script setup lang="ts">
import { CircleAlert, RotateCw } from '@lucide/vue'
import UiButton from './UiButton.vue'
import UiIcon from './UiIcon.vue'

/** Falha ao carregar: diz o que aconteceu e oferece tentar de novo. */
const { title = 'Não foi possível carregar', retrying = false } = defineProps<{
  title?: string
  description?: string
  retrying?: boolean
}>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div role="alert" class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
    <span
      class="grid size-10 place-items-center rounded-card border border-border bg-danger-soft text-danger"
    >
      <UiIcon :icon="CircleAlert" :size="20" />
    </span>
    <div class="max-w-sm">
      <p class="text-14 font-medium text-fg">{{ title }}</p>
      <p v-if="description" class="mt-1 text-13 text-fg-muted">{{ description }}</p>
    </div>
    <UiButton :icon="RotateCw" :loading="retrying" size="sm" @click="emit('retry')">
      Tentar de novo
    </UiButton>
  </div>
</template>

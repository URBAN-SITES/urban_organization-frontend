<script setup lang="ts">
import { useId } from 'vue'

/** Interruptor (role="switch"): liga/desliga com efeito imediato. */
const model = defineModel<boolean>({ default: false })
const props = defineProps<{
  label: string
  description?: string
  disabled?: boolean
  id?: string
}>()
const fallbackId = useId()
const switchId = props.id ?? fallbackId
</script>

<template>
  <div class="flex items-start justify-between gap-4">
    <span class="flex flex-col">
      <label
        :for="switchId"
        :class="['text-14 text-fg', disabled ? 'opacity-50' : 'cursor-pointer']"
      >
        {{ label }}
      </label>
      <span v-if="description" :id="`${switchId}-desc`" class="text-13 text-fg-muted">
        {{ description }}
      </span>
    </span>
    <button
      :id="switchId"
      data-ui="switch"
      type="button"
      role="switch"
      :aria-checked="model"
      :aria-describedby="description ? `${switchId}-desc` : undefined"
      :disabled="disabled"
      :class="[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent',
        'transition-colors duration-(--dur-fast) ease-out disabled:cursor-not-allowed disabled:opacity-50',
        model ? 'bg-accent' : 'bg-surface-3 border-border-strong',
      ]"
      @click="model = !model"
    >
      <span
        aria-hidden="true"
        :class="[
          'size-4 rounded-full bg-white shadow-sm transition-transform duration-(--dur-fast) ease-out',
          model ? 'translate-x-4' : 'translate-x-0.5',
        ]"
      />
    </button>
  </div>
</template>

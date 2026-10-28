<script setup lang="ts">
import { Check, Minus } from '@lucide/vue'
import { useId } from 'vue'

/** Checkbox nativo (acessível de graça) com aparência do sistema. */
const model = defineModel<boolean>({ default: false })
const props = defineProps<{
  label?: string
  description?: string
  indeterminate?: boolean
  disabled?: boolean
  id?: string
}>()
const fallbackId = useId()
const inputId = props.id ?? fallbackId
</script>

<template>
  <div class="flex items-start gap-2.5">
    <span class="relative mt-0.5 inline-grid size-4 shrink-0 place-items-center">
      <input
        :id="inputId"
        v-model="model"
        type="checkbox"
        :disabled="disabled"
        :indeterminate="indeterminate"
        :aria-describedby="description ? `${inputId}-desc` : undefined"
        class="peer size-4 cursor-pointer appearance-none rounded-[4px] border border-border-strong bg-surface-1 transition-colors duration-(--dur-fast) ease-out checked:border-fg checked:bg-fg indeterminate:border-fg indeterminate:bg-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Check
        :size="12"
        :stroke-width="3"
        aria-hidden="true"
        class="pointer-events-none absolute scale-50 text-bg opacity-0 transition-[opacity,scale] duration-(--dur-fast) ease-out peer-checked:scale-100 peer-checked:opacity-100 peer-indeterminate:opacity-0"
      />
      <Minus
        :size="12"
        :stroke-width="3"
        aria-hidden="true"
        class="pointer-events-none absolute text-bg opacity-0 peer-indeterminate:opacity-100"
      />
    </span>
    <span v-if="label || description || $slots.label" class="flex flex-col">
      <label
        :for="inputId"
        :class="['text-14 text-fg', disabled ? 'opacity-50' : 'cursor-pointer']"
      >
        <slot name="label">{{ label }}</slot>
      </label>
      <span v-if="description" :id="`${inputId}-desc`" class="text-13 text-fg-muted">
        {{ description }}
      </span>
    </span>
  </div>
</template>

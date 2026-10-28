<script setup lang="ts">
import { useId, type Component } from 'vue'
import UiField from './UiField.vue'
import UiIcon from './UiIcon.vue'
import { controlClasses } from './controlClasses'

defineOptions({ inheritAttrs: false })
const model = defineModel<string>({ default: '' })
const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    type?: 'text' | 'email' | 'password' | 'search' | 'url' | 'tel' | 'number'
    icon?: Component
    required?: boolean
    disabled?: boolean
    id?: string
  }>(),
  { type: 'text' },
)
const fallbackId = useId()
const inputId = props.id ?? fallbackId
</script>

<template>
  <UiField :id="inputId" :label="label" :hint="hint" :error="error" :required="required">
    <template #default="{ describedby, invalid }">
      <div class="relative">
        <UiIcon
          v-if="icon"
          :icon="icon"
          class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg-muted"
        />
        <input
          :id="inputId"
          v-model="model"
          v-bind="$attrs"
          :type="type"
          :required="required"
          :disabled="disabled"
          :aria-describedby="describedby"
          :aria-invalid="invalid"
          :class="[controlClasses, 'h-9 px-3', icon ? 'pl-8' : '']"
        />
      </div>
    </template>
  </UiField>
</template>

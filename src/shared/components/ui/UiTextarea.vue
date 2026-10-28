<script setup lang="ts">
import { useId } from 'vue'
import UiField from './UiField.vue'
import { controlClasses } from './controlClasses'

defineOptions({ inheritAttrs: false })
const model = defineModel<string>({ default: '' })
const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    rows?: number
    required?: boolean
    disabled?: boolean
    id?: string
  }>(),
  { rows: 4 },
)
const fallbackId = useId()
const inputId = props.id ?? fallbackId
</script>

<template>
  <UiField :id="inputId" :label="label" :hint="hint" :error="error" :required="required">
    <template #default="{ describedby, invalid }">
      <textarea
        :id="inputId"
        v-model="model"
        v-bind="$attrs"
        :rows="rows"
        :required="required"
        :disabled="disabled"
        :aria-describedby="describedby"
        :aria-invalid="invalid"
        :class="[controlClasses, 'min-h-20 resize-y px-3 py-2 leading-5']"
      />
    </template>
  </UiField>
</template>

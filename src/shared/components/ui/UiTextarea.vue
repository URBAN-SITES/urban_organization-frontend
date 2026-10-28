<script setup lang="ts">
import { computed, useAttrs, useId } from 'vue'
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
// class/style vão para o bloco do campo (layout); o resto (placeholder, autocomplete...) para o controle
const attrs = useAttrs()
const controlAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style')),
)
</script>

<template>
  <UiField
    :id="inputId"
    :class="$attrs.class"
    :style="$attrs.style"
    :label="label"
    :hint="hint"
    :error="error"
    :required="required"
  >
    <template #default="{ describedby, invalid }">
      <textarea
        :id="inputId"
        v-model="model"
        v-bind="controlAttrs"
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

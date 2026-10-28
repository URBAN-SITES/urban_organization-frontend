<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { computed, useAttrs, useId } from 'vue'
import UiField from './UiField.vue'
import UiIcon from './UiIcon.vue'
import { controlClasses } from './controlClasses'

/** Select nativo estilizado: teclado, leitores de tela e mobile funcionam sem esforço. */
defineOptions({ inheritAttrs: false })
const model = defineModel<string>({ default: '' })
const props = defineProps<{
  options: { value: string; label: string; disabled?: boolean }[]
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  id?: string
}>()
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
      <div class="relative">
        <select
          :id="inputId"
          v-model="model"
          v-bind="controlAttrs"
          :required="required"
          :disabled="disabled"
          :aria-describedby="describedby"
          :aria-invalid="invalid"
          :class="[controlClasses, 'h-9 cursor-pointer appearance-none pr-8 pl-3']"
        >
          <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
          <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :disabled="option.disabled"
          >
            {{ option.label }}
          </option>
        </select>
        <UiIcon
          :icon="ChevronDown"
          class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-fg-muted"
        />
      </div>
    </template>
  </UiField>
</template>

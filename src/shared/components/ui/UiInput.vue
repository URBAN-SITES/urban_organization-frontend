<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
import { computed, ref, useAttrs, useId, type Component } from 'vue'
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
    type?: 'text' | 'email' | 'password' | 'search' | 'url' | 'tel' | 'number' | 'date'
    icon?: Component
    required?: boolean
    disabled?: boolean
    id?: string
    size?: 'md' | 'lg'
  }>(),
  { type: 'text', size: 'md' },
)
// senha ganha um botão de mostrar/ocultar
const revealed = ref(false)
const inputType = computed(() =>
  props.type === 'password' && revealed.value ? 'text' : props.type,
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
      <div class="relative">
        <UiIcon
          v-if="icon"
          :icon="icon"
          :class="[
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-muted',
            size === 'lg' ? 'left-3.5' : 'left-2.5',
          ]"
        />
        <input
          :id="inputId"
          v-model="model"
          v-bind="controlAttrs"
          :type="inputType"
          :required="required"
          :disabled="disabled"
          :aria-describedby="describedby"
          :aria-invalid="invalid"
          :class="[
            controlClasses,
            size === 'lg' ? 'h-11 px-3.5' : 'h-9 px-3',
            icon ? (size === 'lg' ? 'pl-10' : 'pl-8') : '',
            type === 'password' ? 'pr-10' : '',
          ]"
        />
        <button
          v-if="type === 'password'"
          type="button"
          :aria-label="revealed ? 'Ocultar senha' : 'Mostrar senha'"
          :aria-pressed="revealed"
          :aria-controls="inputId"
          :disabled="disabled"
          class="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-control text-fg-muted transition-colors duration-(--dur-fast) ease-out hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed"
          @click="revealed = !revealed"
        >
          <UiIcon :icon="revealed ? EyeOff : Eye" />
        </button>
      </div>
    </template>
  </UiField>
</template>

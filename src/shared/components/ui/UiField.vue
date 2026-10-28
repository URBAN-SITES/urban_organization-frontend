<script setup lang="ts">
/**
 * Rótulo, dica e erro de um campo. O slot recebe os atributos ARIA para o controle.
 * Erro substitui a dica e é anunciado (role="alert" só aparece quando há erro).
 */
const {
  id,
  label,
  hint,
  error,
  required = false,
} = defineProps<{
  id: string
  label?: string
  hint?: string
  error?: string
  required?: boolean
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="id" class="text-13 font-medium text-fg">
      {{ label }}<span v-if="required" class="text-fg-muted" aria-hidden="true"> *</span>
    </label>
    <slot
      :describedby="error || hint ? `${id}-desc` : undefined"
      :invalid="error ? true : undefined"
    />
    <p v-if="error" :id="`${id}-desc`" role="alert" class="text-12 text-danger">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-desc`" class="text-12 text-fg-muted">{{ hint }}</p>
  </div>
</template>

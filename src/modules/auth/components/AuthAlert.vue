<script setup lang="ts">
import { CircleAlert, CircleCheck } from '@lucide/vue'

/**
 * Aviso do formulário de acesso (erro do servidor ou confirmação). Entra de cima;
 * o erro balança uma vez para chamar a atenção. Sem mensagem, não ocupa espaço.
 */
const { message, tone = 'error' } = defineProps<{
  message?: string
  tone?: 'error' | 'success'
}>()
</script>

<template>
  <Transition name="auth-feedback">
    <p
      v-if="message"
      :role="tone === 'error' ? 'alert' : 'status'"
      :class="['auth-alert', tone === 'error' ? 'auth-error is-error' : 'is-success']"
    >
      <component
        :is="tone === 'error' ? CircleAlert : CircleCheck"
        :size="16"
        class="mt-px shrink-0"
        aria-hidden="true"
      />
      <span>{{ message }}</span>
    </p>
  </Transition>
</template>

<style>
.auth-alert {
  display: flex;
  gap: 8px;
  border: 1px solid;
  border-radius: var(--radius-control);
  padding: 10px 12px;
  font-size: var(--text-13);
  line-height: 1.45;
}

.auth-alert.is-error {
  border-color: color-mix(in srgb, var(--ds-danger) 30%, transparent);
  background: var(--ds-danger-soft);
  color: var(--ds-danger);
}

.auth-alert.is-success {
  border-color: color-mix(in srgb, var(--ds-success) 30%, transparent);
  background: var(--ds-success-soft);
  color: var(--ds-success);
}
</style>

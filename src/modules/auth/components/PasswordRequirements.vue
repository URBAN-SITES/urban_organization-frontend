<script setup lang="ts">
import { Check } from '@lucide/vue'
import { computed } from 'vue'

/**
 * Requisitos da senha marcados enquanto a pessoa digita. Os dois primeiros são as regras do
 * backend (iguais a passwordProblem); o terceiro é só recomendação e está escrito assim.
 */
const props = defineProps<{ password: string }>()

const rules = computed(() => [
  { text: 'Pelo menos 9 caracteres', ok: props.password.length >= 9 },
  { text: 'Não pode ser só números', ok: props.password !== '' && !/^\d+$/.test(props.password) },
  {
    text: 'Combine letras e números (recomendado)',
    ok: /[a-zA-Z]/.test(props.password) && /\d/.test(props.password),
  },
])
</script>

<template>
  <ul class="grid gap-1.5" aria-label="Requisitos da senha">
    <li
      v-for="rule in rules"
      :key="rule.text"
      :class="[
        'flex items-center gap-2 text-12 transition-colors duration-(--dur-base) ease-out',
        rule.ok ? 'text-fg' : 'text-fg-muted',
      ]"
    >
      <span
        :class="[
          'grid size-4 shrink-0 place-items-center rounded-full border transition-[background-color,border-color] duration-(--dur-base) ease-out',
          rule.ok ? 'border-accent bg-accent' : 'border-border-strong',
        ]"
        aria-hidden="true"
      >
        <Check
          :size="10"
          :stroke-width="3.5"
          :class="[
            'text-accent-fg transition-[opacity,scale] duration-(--dur-base) ease-out',
            rule.ok ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          ]"
        />
      </span>
      {{ rule.text }}
      <span class="sr-only">{{ rule.ok ? '(atendido)' : '(pendente)' }}</span>
    </li>
  </ul>
</template>

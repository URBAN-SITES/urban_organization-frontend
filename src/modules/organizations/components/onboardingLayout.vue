<script setup lang="ts">
import { ArrowLeft, Check } from '@lucide/vue'
import { AuthHeading, AuthShell } from '@/modules/auth'

defineProps<{
  step: number
  steps: readonly string[]
  title: string
  description: string
}>()
</script>

<template>
  <AuthShell>
    <section aria-labelledby="onboarding-title">
      <RouterLink
        to="/organizacoes"
        class="mb-8 inline-flex items-center gap-1.5 rounded-[4px] text-13 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        <ArrowLeft :size="16" aria-hidden="true" />
        Voltar para organizações
      </RouterLink>

      <ol class="mb-6 flex items-center gap-2 text-12" aria-label="Etapas de configuração">
        <li
          v-for="(label, index) in steps"
          :key="label"
          :aria-current="index === step - 1 ? 'step' : undefined"
          :class="[
            'flex items-center gap-2',
            index < step ? 'text-fg' : 'text-fg-muted',
            index === step - 1 ? 'font-medium' : '',
          ]"
        >
          <span
            :class="[
              'grid size-5 place-items-center rounded-full border font-mono text-12',
              index < step - 1
                ? 'border-fg bg-fg text-bg'
                : index === step - 1
                  ? 'border-accent text-accent'
                  : 'border-border',
            ]"
          >
            <Check v-if="index < step - 1" :size="12" :stroke-width="3" aria-label="Concluída" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          {{ label }}
          <span
            v-if="index < steps.length - 1"
            class="h-px w-4 bg-border sm:w-6"
            aria-hidden="true"
          />
        </li>
      </ol>

      <AuthHeading heading-id="onboarding-title" :title="title" :description="description" />
      <slot />
    </section>
  </AuthShell>
</template>

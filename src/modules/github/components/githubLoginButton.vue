<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { ref } from 'vue'
import { UiSpinner } from '@/shared/components'
import { startGitHubAuthorization } from '../composables'

/** "Continuar com GitHub": cria a conta ou entra; `returnTo` é para onde ir depois. */
const props = defineProps<{ returnTo: string; disabled?: boolean; label?: string }>()
const emit = defineEmits<{ error: [message: string] }>()
const loading = ref(false)

async function start() {
  if (loading.value) return
  loading.value = true
  try {
    await startGitHubAuthorization('login', props.returnTo)
  } catch (cause) {
    loading.value = false
    emit('error', cause instanceof Error ? cause.message : 'Não foi possível abrir o GitHub.')
  }
}
</script>

<template>
  <!-- mesmo visual do botão do Google nas telas de acesso (classe auth-social, do AuthShell) -->
  <button
    type="button"
    class="auth-social"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    @click="start"
  >
    <UiSpinner v-if="loading" :size="16" />
    <svg
      v-else
      class="size-[18px] shrink-0"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
    <span class="flex-1 text-center">{{ label ?? 'Continuar com GitHub' }}</span>
    <ArrowRight :size="16" class="auth-social-arrow shrink-0" aria-hidden="true" />
  </button>
</template>

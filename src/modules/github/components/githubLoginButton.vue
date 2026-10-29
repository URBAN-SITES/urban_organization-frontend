<script setup lang="ts">
import { GitBranch } from '@lucide/vue'
import { ref } from 'vue'
import { UiButton } from '@/shared/components'
import { startGitHubAuthorization } from '../composables'

/** "Continuar com GitHub": cria a conta ou entra; `returnTo` é para onde ir depois. */
const props = defineProps<{ returnTo: string; disabled?: boolean }>()
const emit = defineEmits<{ error: [message: string] }>()
const loading = ref(false)

async function start() {
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
  <UiButton
    size="xl"
    block
    :icon="GitBranch"
    :loading="loading"
    :disabled="disabled"
    @click="start"
  >
    Continuar com GitHub
  </UiButton>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { AuthTransitionOverlay, useAuthStore } from '@/modules/auth'
import { CircleAlert } from '@lucide/vue'
import { UiButton, UiEmptyState } from '@/shared/components'
import { takeGitHubReturnTo } from '../composables'
import { finishGitHubAuthorization } from '../services'

/** O GitHub volta para cá com ?code&state; o backend sabe pelo state se era login ou conexão. */
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const error = ref('')

onMounted(async () => {
  const { code, state } = route.query
  if (route.query.error === 'access_denied') {
    error.value = 'Você cancelou a autorização no GitHub.'
    return
  }
  if (typeof code !== 'string' || typeof state !== 'string') {
    error.value = 'O GitHub não enviou os dados da autorização. Comece de novo.'
    return
  }
  try {
    const result = await finishGitHubAuthorization(code, state)
    if (result.purpose === 'login') {
      if (!(await auth.loadUser())) throw new Error('Sua sessão não foi criada. Entre novamente.')
      await router.replace(takeGitHubReturnTo('/'))
      return
    }
    toast.success(
      result.purpose === 'link'
        ? `Login com GitHub vinculado a @${result.login}.`
        : `GitHub conectado como @${result.login}.`,
    )
    await router.replace(takeGitHubReturnTo('/integracoes/github'))
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Não foi possível concluir.'
  }
})
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-bg px-4 text-fg">
    <div class="w-full max-w-sm">
      <UiEmptyState
        v-if="error"
        :icon="CircleAlert"
        title="Não deu certo com o GitHub"
        :description="error"
      >
        <template #action>
          <UiButton @click="router.replace(auth.user ? '/integracoes/github' : '/entrar')">
            Voltar
          </UiButton>
        </template>
      </UiEmptyState>
      <AuthTransitionOverlay
        v-else
        visible
        title="Concluindo com o GitHub..."
        description="Confirmando sua conta com segurança."
      />
    </div>
  </main>
</template>

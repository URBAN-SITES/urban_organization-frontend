<script setup lang="ts">
import { ref, watch } from 'vue'
import { Toaster, toast } from 'vue-sonner'
import { useRoute, useRouter } from 'vue-router'
import { bootFailed } from '@/app/boot'
import ConnectionStatus from '@/app/components/ConnectionStatus.vue'
import RouteProgress from '@/app/components/RouteProgress.vue'
import { useTheme } from '@/app/composables/useTheme'

// o tema do Toaster acompanha o tema da aplicação
const { isDark } = useTheme()
import { AuthTransitionOverlay, useAuthStore } from '@/modules/auth'
import { finishGoogleConnect } from '@/modules/calendar_sync'
import { useNotificationSession } from '@/modules/notifications'
import { UiConfirmHost, UiErrorState } from '@/shared/components'

const auth = useAuthStore()
const route = useRoute()
useNotificationSession(() => auth.user?.id)

// Entrar ou sair troca o contexto inteiro (área de acesso <-> app): transição um pouco mais marcada.
const transition = ref('page')
watch(
  () => route.meta.transitionGroup,
  (group, previous) => {
    transition.value = group === 'auth' || previous === 'auth' ? 'page-context' : 'page'
  },
)

// A capa de saída só some depois que a sessão foi encerrada e a tela de entrada já está montada.
// O mínimo curto evita um piscar quando o servidor responde rápido; não antecipa nada.
const MIN_SIGN_OUT_COVER_MS = 450
watch(
  () => route.meta.transitionGroup,
  (group) => {
    if (group !== 'auth' || !auth.isSigningOut) return
    const remaining = Math.max(0, MIN_SIGN_OUT_COVER_MS - (Date.now() - auth.signOutStartedAt))
    window.setTimeout(auth.finishSignOut, remaining)
  },
)

// a primeira navegação falhou (sem rede ao checar a sessão): oferece tentar de novo
const router = useRouter()
const retrying = ref(false)
async function retryBoot() {
  retrying.value = true
  try {
    await router.replace(window.location.pathname + window.location.search + window.location.hash)
    bootFailed.value = router.currentRoute.value.matched.length === 0
  } finally {
    retrying.value = false
  }
}

// volta do consentimento do Google (Meet, Drive...)
finishGoogleConnect()
  .then(async (returnTo) => {
    if (returnTo === null) return
    toast.success('Google conectado. Repita a ação que você tinha iniciado.')
    await router.replace(returnTo)
  })
  .catch((e: unknown) =>
    toast.error(e instanceof Error ? e.message : 'Falha ao conectar o Google.'),
  )
</script>

<template>
  <RouteProgress />
  <ConnectionStatus />
  <main v-if="bootFailed" class="grid min-h-dvh place-items-center bg-bg">
    <UiErrorState
      title="Não foi possível abrir o Urban Organization"
      description="Não conseguimos confirmar sua sessão. Confira a conexão e tente de novo."
      :retrying="retrying"
      @retry="retryBoot"
    />
  </main>
  <RouterView v-slot="{ Component, route: current }">
    <Transition :name="transition" mode="out-in" appear>
      <component :is="Component" :key="current.meta.transitionGroup ?? current.path" />
    </Transition>
  </RouterView>
  <!-- até 3 toasts visíveis; os seguintes esperam na fila do vue-sonner -->
  <Toaster
    :theme="isDark ? 'dark' : 'light'"
    position="bottom-right"
    :visible-toasts="3"
    close-button
    class="ui-toaster"
  />
  <UiConfirmHost />
  <AuthTransitionOverlay
    :visible="auth.isSigningOut"
    title="Saindo da sua conta..."
    description="Encerrando a sessão neste dispositivo."
  />
  <AuthTransitionOverlay
    :visible="!auth.isSigningOut && auth.loadingScreen !== null"
    :title="auth.loadingScreen?.title ?? ''"
    :description="auth.loadingScreen?.description"
  />
</template>

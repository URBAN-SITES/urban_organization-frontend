<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import AppSidebar from './components/AppSidebar.vue'
import CommandPalette from './components/CommandPalette.vue'
import MobileNav from './components/MobileNav.vue'
import { ShellKey } from '@/shared/composables/shell'
import { useChatAlerts } from '@/modules/chat'
import { useInvitationsStore } from '@/modules/invitations'
import { useAuthStore } from '@/modules/auth'
import { useNotificationsStore } from '@/modules/notifications'
import { useOrganizationsStore } from '@/modules/organizations'
import { QuickTaskDialog, RunningTimer, ShortcutsDialog } from '@/modules/module'

const notifications = useNotificationsStore()
const organizations = useOrganizationsStore()
const router = useRouter()
useChatAlerts()

// convites recebidos: carrega ao entrar e de novo quando chega uma notificação nova
const auth = useAuthStore()
const invitations = useInvitationsStore()
watch(
  () => [auth.user?.id, notifications.unreadCount] as const,
  ([user]) => {
    if (user) void invitations.loadMine().catch(() => undefined)
    else invitations.mine = []
  },
  { immediate: true },
)

const paletteOpen = ref(false)

// a capa de saída (App.vue) fica visível do clique até a tela de entrada estar montada
async function signOut() {
  if (auth.isSigningOut) return
  try {
    await auth.signOut()
  } catch {
    toast.error('Não foi possível sair agora. Confira a conexão e tente de novo.')
    return
  }
  organizations.organizations = []
  await router.push('/entrar')
}

provide(ShellKey, {
  organization: computed(() => {
    const current = organizations.current
    if (!current) return ''
    return current.is_personal ? 'Espaço pessoal' : current.name
  }),
  unread: computed(() => notifications.unreadCount),
  user: computed(() =>
    auth.user
      ? { name: auth.user.name, email: auth.user.email, avatarUrl: auth.user.avatar_url }
      : null,
  ),
  openPalette: () => (paletteOpen.value = true),
  signOut,
})
</script>

<template>
  <div>
    <!-- raiz única: com várias raízes a <Transition> do App não sai do layout e a tela fica em branco -->
    <div class="flex min-h-dvh items-start bg-bg">
      <AppSidebar />
      <main class="min-w-0 flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <slot>
          <!-- sem key: só anima quando a tela muda, não quando muda só o parâmetro ou a query -->
          <RouterView v-slot="{ Component }">
            <Transition name="page" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </slot>
      </main>
    </div>
    <MobileNav />
    <CommandPalette v-if="auth.user" v-model:open="paletteOpen" @sign-out="signOut" />
    <template v-if="auth.user">
      <QuickTaskDialog />
      <ShortcutsDialog />
      <RunningTimer />
    </template>
  </div>
</template>

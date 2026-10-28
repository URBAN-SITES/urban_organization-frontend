<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import CommandPalette from './components/CommandPalette.vue'
import MobileNav from './components/MobileNav.vue'
import { ShellKey } from '@/shared/composables/shell'
import { useChatAlerts } from '@/modules/chat'
import { useInvitationsStore } from '@/modules/invitations'
import { useAuthStore } from '@/modules/auth'
import { useNotificationsStore } from '@/modules/notifications'
import { useOrganizationsStore } from '@/modules/organizations'

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

async function signOut() {
  await auth.signOut()
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
  <div class="flex min-h-dvh items-start bg-bg">
    <AppSidebar />
    <main class="min-w-0 flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <slot><RouterView /></slot>
    </main>
  </div>
  <MobileNav @sign-out="signOut" />
  <CommandPalette v-if="auth.user" v-model:open="paletteOpen" @sign-out="signOut" />
</template>

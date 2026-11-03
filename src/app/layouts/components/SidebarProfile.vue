<script setup lang="ts">
import {
  Bell,
  ChevronsUpDown,
  CircleHelp,
  LogOut,
  Receipt,
  Settings,
  SlidersHorizontal,
  UserRound,
} from '@lucide/vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import { useNotificationsStore } from '@/modules/notifications'
import { UiAvatar, UiMenu, type MenuItem } from '@/shared/components'
import { useShell } from '@/shared/composables/shell'

/** Pé da barra: notificações e a pessoa logada, com o menu da conta. */
const { collapsed = false } = defineProps<{ collapsed?: boolean }>()

const auth = useAuthStore()
const notifications = useNotificationsStore()
const shell = useShell()
const route = useRoute()
const router = useRouter()

const unread = computed(() => notifications.unreadCount)
const onNotifications = computed(() => route.path.startsWith('/notificacoes'))
const bellLabel = computed(() =>
  unread.value ? `Notificações, ${unread.value} não lidas` : 'Notificações',
)

const menu = computed<MenuItem[]>(() => [
  { label: 'Meu perfil', icon: UserRound, onSelect: () => void router.push('/configuracoes') },
  {
    label: 'Configurações',
    icon: Settings,
    onSelect: () => void router.push('/configuracoes?aba=organization'),
  },
  {
    label: 'Preferências',
    icon: SlidersHorizontal,
    onSelect: () => void router.push('/configuracoes?aba=preferences'),
  },
  { label: 'Faturamento', icon: Receipt, onSelect: () => void router.push('/faturamento') },
  {
    label: 'Ajuda e atalhos',
    icon: CircleHelp,
    shortcut: 'Ctrl K',
    onSelect: shell.openPalette,
  },
  {
    label: auth.isSigningOut ? 'Saindo...' : 'Sair da conta',
    icon: LogOut,
    danger: true,
    disabled: auth.isSigningOut,
    separatorBefore: true,
    onSelect: () => void shell.signOut(),
  },
])
</script>

<template>
  <div v-if="auth.user" :class="['sb-footer', { 'is-collapsed': collapsed }]">
    <RouterLink
      to="/notificacoes"
      :aria-label="bellLabel"
      :aria-current="onNotifications ? 'page' : undefined"
      :data-active="onNotifications || undefined"
      class="sb-link sb-bell group h-9 text-13"
    >
      <span class="sb-link-icon" aria-hidden="true">
        <Bell :size="18" :stroke-width="1.75" :class="['shrink-0', { 'sb-ring': unread }]" />
        <span v-if="unread && collapsed" :key="unread" class="sb-dot" />
      </span>
      <span class="sidebar-label min-w-0 flex-1 truncate">Notificações</span>
      <span v-if="unread && !collapsed" :key="unread" class="sb-count sidebar-label">
        {{ unread > 99 ? '99+' : unread }}
      </span>
    </RouterLink>

    <UiMenu
      :items="menu"
      label="Conta"
      :placement="collapsed ? 'right' : 'top-start'"
      class="flex w-full"
    >
      <template #trigger="{ props: trigger, open }">
        <button
          v-bind="trigger"
          type="button"
          data-ui="profile-menu"
          :aria-label="`${auth.user.name}: menu da conta`"
          :class="['sb-profile', { 'is-open': open }]"
        >
          <UiAvatar :name="auth.user.name" :src="auth.user.avatar_url" size="md" />
          <span class="sidebar-label min-w-0 flex-1 text-left">
            <span class="block truncate text-13 leading-4 font-medium text-white">
              {{ auth.user.name }}
            </span>
            <span class="block truncate text-12 leading-4 text-[var(--sb-muted)]">
              {{ auth.user.email }}
            </span>
          </span>
          <ChevronsUpDown
            :size="14"
            class="sidebar-label shrink-0 text-[var(--sb-muted)]"
            aria-hidden="true"
          />
        </button>
      </template>
    </UiMenu>
  </div>
</template>

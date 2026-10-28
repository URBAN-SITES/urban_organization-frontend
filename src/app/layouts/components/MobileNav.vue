<script setup lang="ts">
import { LogOut, Menu } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import { useChatStore } from '@/modules/chat'
import { useNotificationsStore } from '@/modules/notifications'
import { useOrganizationsStore } from '@/modules/organizations'
import { UiButton, UiDrawer, UiIcon, UiSelect } from '@/shared/components'
import { accountNav, isNavActive, workspaceNav, type NavItem } from '../navigation'

const emit = defineEmits<{ signOut: [] }>()

// As quatro telas do dia a dia ficam na barra; o resto abre em "Mais".
const tabs = workspaceNav.slice(0, 4)
const more: NavItem[] = [...workspaceNav.slice(4), ...accountNav]

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const notifications = useNotificationsStore()
const chat = useChatStore()

const open = ref(false)
watch(
  () => route.fullPath,
  () => (open.value = false),
)

const moreActive = computed(() => more.some((item) => isNavActive(item, route.path)))
const organizationId = computed({
  get: () => organizations.current?.id ?? '',
  set: (id: string) => {
    organizations.select(id)
    void router.push('/')
  },
})
const organizationOptions = computed(() =>
  organizations.organizations.map((organization) => ({
    value: organization.id,
    label: organization.is_personal ? `${organization.name} (pessoal)` : organization.name,
  })),
)

const tabClass = (active: boolean) => [
  'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-12 outline-none',
  'transition-colors duration-(--dur-fast) ease-out focus-visible:bg-surface-2',
  active ? 'font-medium text-fg' : 'text-fg-muted',
]
</script>

<template>
  <nav
    v-if="auth.user"
    aria-label="Navegação principal"
    class="fixed inset-x-0 bottom-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] border-t border-border bg-surface-1 pb-[env(safe-area-inset-bottom)] md:hidden"
  >
    <RouterLink
      v-for="item in tabs"
      :key="item.to"
      :to="item.to"
      :aria-current="isNavActive(item, route.path) ? 'page' : undefined"
      :class="tabClass(isNavActive(item, route.path))"
    >
      <UiIcon
        :icon="item.icon"
        :size="20"
        :class="isNavActive(item, route.path) ? 'text-accent' : ''"
      />
      {{ item.label }}
      <span
        v-if="item.to === '/chat' && chat.unreadTotal"
        class="absolute top-1.5 left-1/2 ml-2 rounded-full bg-accent px-1 font-mono text-[10px] text-accent-fg"
        :aria-label="`${chat.unreadTotal} mensagens não lidas`"
      >
        {{ chat.unreadTotal > 99 ? '99+' : chat.unreadTotal }}
      </span>
    </RouterLink>
    <button
      data-ui="mobile-more"
      type="button"
      :aria-expanded="open"
      aria-haspopup="dialog"
      :class="[tabClass(moreActive || open), 'cursor-pointer']"
      @click="open = true"
    >
      <UiIcon :icon="Menu" :size="20" :class="moreActive ? 'text-accent' : ''" />
      Mais
      <span
        v-if="notifications.unreadCount"
        class="absolute top-2 left-1/2 ml-2 size-1.5 rounded-full bg-accent"
        aria-hidden="true"
      />
    </button>
  </nav>

  <UiDrawer v-model:open="open" title="Mais opções" side="bottom">
    <UiSelect
      v-if="organizationOptions.length"
      v-model="organizationId"
      label="Organização"
      :options="organizationOptions"
    />
    <ul class="mt-3 grid gap-0.5">
      <li v-for="item in more" :key="item.to">
        <RouterLink
          :to="item.to"
          :aria-current="isNavActive(item, route.path) ? 'page' : undefined"
          class="flex h-11 items-center gap-3 rounded-control px-2 text-14 text-fg hover:bg-surface-2 aria-[current=page]:bg-surface-2"
        >
          <UiIcon :icon="item.icon" :size="20" class="text-fg-muted" />
          <span class="flex-1">{{ item.label }}</span>
          <span
            v-if="item.to === '/notificacoes' && notifications.unreadCount"
            class="font-mono text-12 text-fg-muted"
          >
            {{ notifications.unreadCount }}
          </span>
        </RouterLink>
      </li>
    </ul>
    <template #footer>
      <div class="flex w-full items-center gap-3">
        <span class="min-w-0 flex-1 text-13 text-fg-muted">
          <span class="block truncate font-medium text-fg">{{ auth.user?.name }}</span>
          <span class="block truncate">{{ auth.user?.email }}</span>
        </span>
        <UiButton :icon="LogOut" variant="ghost" @click="emit('signOut')">Sair</UiButton>
      </div>
    </template>
  </UiDrawer>
</template>

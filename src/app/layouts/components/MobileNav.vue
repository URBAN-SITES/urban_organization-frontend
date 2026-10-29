<script setup lang="ts">
import { Menu } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import { useChatStore } from '@/modules/chat'
import { useNotificationsStore } from '@/modules/notifications'
import { UiDrawer, UiIcon } from '@/shared/components'
import { isNavActive, workspaceNav } from '../navigation'
import SidebarNav from './SidebarNav.vue'
import SidebarProfile from './SidebarProfile.vue'

// As quatro telas do dia a dia ficam na barra; "Menu" abre a navegação completa num painel.
const tabs = workspaceNav.slice(0, 4)

const route = useRoute()
const auth = useAuthStore()
const notifications = useNotificationsStore()
const chat = useChatStore()

const open = ref(false)
watch(
  () => route.fullPath,
  () => (open.value = false),
)

const menuActive = computed(() => !tabs.some((item) => isNavActive(item, route.path)))

const tabClass = (active: boolean) => [
  'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-12 outline-none',
  'transition-[color,scale] duration-(--dur-fast) ease-out focus-visible:bg-surface-2 active:scale-[0.96]',
  active ? 'font-medium text-fg' : 'text-fg-muted',
]
</script>

<template>
  <nav
    v-if="auth.user"
    aria-label="Navegação rápida"
    class="fixed inset-x-0 bottom-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] border-t border-border bg-surface-1 pb-[env(safe-area-inset-bottom)] md:hidden"
  >
    <RouterLink
      v-for="item in tabs"
      :key="item.to"
      :to="item.to"
      :aria-current="isNavActive(item, route.path) ? 'page' : undefined"
      :class="tabClass(isNavActive(item, route.path))"
    >
      <span
        v-if="isNavActive(item, route.path)"
        class="mobile-tab-indicator absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent"
        aria-hidden="true"
      />
      <UiIcon :icon="item.icon" :size="20" />
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
      :class="[tabClass(menuActive || open), 'cursor-pointer']"
      @click="open = true"
    >
      <span
        v-if="menuActive"
        class="mobile-tab-indicator absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent"
        aria-hidden="true"
      />
      <UiIcon :icon="Menu" :size="20" />
      Menu
      <span
        v-if="notifications.unreadCount"
        class="absolute top-2 left-1/2 ml-2 size-1.5 rounded-full bg-accent"
        aria-hidden="true"
      />
    </button>
  </nav>

  <UiDrawer v-model:open="open" title="Menu" side="left" width="sm">
    <div class="-mx-3 -mt-1 flex min-h-full flex-col">
      <SidebarNav size="lg" />
    </div>
    <template #footer>
      <div class="w-full">
        <SidebarProfile />
      </div>
    </template>
  </UiDrawer>
</template>

<style scoped>
.mobile-tab-indicator {
  animation: mobile-tab-indicator var(--dur-base) var(--ease-out);
}

@keyframes mobile-tab-indicator {
  from {
    opacity: 0;
    transform: scaleX(0.4);
  }
}
</style>

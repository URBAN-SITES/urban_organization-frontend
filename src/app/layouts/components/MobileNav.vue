<script setup lang="ts">
import { Menu } from '@lucide/vue'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import { useChatStore } from '@/modules/chat'
import { useNotificationsStore } from '@/modules/notifications'
import { UiIcon } from '@/shared/components'
import { useModalLayer } from '@/shared/composables/overlay'
import { useOrganizationsStore } from '@/modules/organizations'
import { forGuest, isNavActive, mobileTabs } from '../navigation'
import SidebarPanel from './SidebarPanel.vue'

// As quatro telas do dia a dia ficam na barra; "Menu" abre a barra lateral completa num painel.
const route = useRoute()
const auth = useAuthStore()
const notifications = useNotificationsStore()
const chat = useChatStore()

const open = ref(false)
const panel = useTemplateRef<HTMLElement>('panel')
useModalLayer(open, panel, () => (open.value = false))
watch(
  () => route.fullPath,
  () => (open.value = false),
)

const organizations = useOrganizationsStore()
const tabs = computed(() =>
  organizations.current?.current_role === 'guest' ? forGuest(mobileTabs) : mobileTabs,
)
const menuActive = computed(() => !tabs.value.some((item) => isNavActive(item, route.path)))

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

  <!-- celular: a mesma barra lateral, como painel deslizante sobre o conteúdo escurecido -->
  <Teleport to="body">
    <Transition name="ui-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] md:hidden"
        aria-hidden="true"
        @click="open = false"
      />
    </Transition>
    <Transition name="sb-drawer">
      <section
        v-if="open"
        ref="panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabindex="-1"
        class="sb-drawer app-sidebar dark fixed inset-y-0 left-0 z-50 w-[min(300px,86vw)] outline-none md:hidden"
      >
        <SidebarPanel size="lg" closable @close="open = false" />
      </section>
    </Transition>
  </Teleport>
</template>

<style>
.sb-drawer.app-sidebar {
  position: fixed;
  width: min(300px, 86vw);
  padding-bottom: env(safe-area-inset-bottom);
}

.sb-drawer-enter-active {
  transition: transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.sb-drawer-leave-active {
  transition: transform 220ms cubic-bezier(0.4, 0, 1, 1);
}

.sb-drawer-enter-from,
.sb-drawer-leave-to {
  transform: translateX(-100%);
}

.mobile-tab-indicator {
  animation: mobile-tab-indicator var(--dur-base) var(--ease-out);
}

@keyframes mobile-tab-indicator {
  from {
    opacity: 0;
    transform: scaleX(0.4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sb-drawer-enter-active,
  .sb-drawer-leave-active {
    transition: none;
  }
}
</style>

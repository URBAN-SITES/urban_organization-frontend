<script setup lang="ts">
import { PanelLeftClose, PanelLeftOpen } from '@lucide/vue'
import { useStorage } from '@vueuse/core'
import { computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/modules/auth'
import { useSectorsStore } from '@/modules/module'
import { useOrganizationsStore } from '@/modules/organizations'
import { UiIcon, UiTooltip } from '@/shared/components'
import SidebarNav from './SidebarNav.vue'
import SidebarProfile from './SidebarProfile.vue'

const auth = useAuthStore()
const organizations = useOrganizationsStore()
const sectors = useSectorsStore()

// recolhida ou não: preferência do usuário, guardada no navegador
const collapsed = useStorage('inceptum:sidebar-collapsed', false)
const toggleLabel = computed(() =>
  collapsed.value ? 'Expandir barra lateral' : 'Recolher barra lateral',
)

// páginas sem guard abrem sem o usuário carregado: confere a sessão
onMounted(async () => {
  if (!auth.user) await auth.loadUser().catch(() => undefined)
  if (auth.user && !organizations.organizations.length) {
    await organizations.load().catch(() => undefined)
  }
})

// trocou de organização (ou de conta): os projetos do menu passam a ser os dela
watch(
  () => [auth.user?.id, organizations.current?.id] as const,
  ([user, id]) => {
    if (user && id) void sectors.load(id).catch(() => undefined)
  },
  { immediate: true },
)
</script>

<template>
  <aside
    :data-collapsed="collapsed || undefined"
    :class="[
      'sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-border bg-surface-1 md:flex',
      collapsed ? 'w-14' : 'w-64',
    ]"
    aria-label="Barra lateral"
  >
    <div class="flex h-12 shrink-0 items-center px-2">
      <RouterLink
        to="/"
        class="flex min-w-0 items-center gap-2.5 rounded-control py-1 pr-2 pl-[10px] focus-visible:outline-2 focus-visible:outline-accent"
        aria-label="Urban Organization: início"
      >
        <img src="/brand/urban-icon-dark.png" alt="" class="size-5 shrink-0 rounded-[4px]" />
        <span
          class="sidebar-label truncate text-13 font-semibold tracking-[0.18em] text-fg uppercase"
        >
          Urban
        </span>
      </RouterLink>
    </div>

    <SidebarNav :collapsed="collapsed" />

    <div class="shrink-0 border-t border-border p-2">
      <UiTooltip :text="toggleLabel" placement="right" :disabled="!collapsed" class="mb-1 flex">
        <button
          type="button"
          data-ui="sidebar-toggle"
          :aria-label="collapsed ? toggleLabel : undefined"
          :aria-expanded="!collapsed"
          class="group flex h-8 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-control px-3 text-13 text-fg-muted transition-[background-color,color,scale] duration-(--dur-fast) ease-out hover:bg-surface-2/70 hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
          @click="collapsed = !collapsed"
        >
          <UiIcon :icon="collapsed ? PanelLeftOpen : PanelLeftClose" :size="16" class="shrink-0" />
          <span class="sidebar-label truncate">Recolher</span>
        </button>
      </UiTooltip>
      <SidebarProfile :collapsed="collapsed" />
    </div>
  </aside>
</template>

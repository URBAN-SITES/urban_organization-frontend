<script setup lang="ts">
import {
  Building2,
  Check,
  ChevronsUpDown,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from '@lucide/vue'
import { useStorage } from '@vueuse/core'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import { useChatStore } from '@/modules/chat'
import { useInvitationsStore } from '@/modules/invitations'
import { useSectorsStore } from '@/modules/module'
import { useNotificationsStore } from '@/modules/notifications'
import { useOrganizationsStore } from '@/modules/organizations'
import { UiIcon, UiIconButton, UiMenu, UiTooltip, type MenuItem } from '@/shared/components'
import { accountNav, isNavActive, workspaceNav, type NavItem } from '../navigation'

const MAX_SECTORS = 8

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const sectors = useSectorsStore()
const chat = useChatStore()
const notifications = useNotificationsStore()
const invitations = useInvitationsStore()

// recolhida ou não: preferência do usuário, guardada no navegador
const collapsed = useStorage('inceptum:sidebar-collapsed', false)

const current = computed(() => organizations.current)
const orgLabel = (name: string, personal: boolean) => (personal ? 'Espaço pessoal' : name)
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'
const visibleSectors = computed(() => sectors.sectors.slice(0, MAX_SECTORS))
const sectorActive = (id: string) => route.path.startsWith(`/setores/${id}`)

function badge(item: NavItem): number {
  if (item.to === '/chat') return chat.unreadTotal
  if (item.to === '/notificacoes') return notifications.unreadCount
  return 0
}

const orgMenu = computed<MenuItem[]>(() => [
  ...organizations.organizations.map((organization) => ({
    label: orgLabel(organization.name, organization.is_personal),
    icon: organization.id === current.value?.id ? Check : undefined,
    onSelect: () => chooseOrganization(organization.id),
  })),
  ...(invitations.mine.length
    ? [
        {
          label: `${invitations.mine.length} ${invitations.mine.length === 1 ? 'convite pendente' : 'convites pendentes'}`,
          icon: Mail,
          separatorBefore: true,
          onSelect: () => void router.push('/'),
        },
      ]
    : []),
  {
    label: 'Nova organização',
    icon: Plus,
    separatorBefore: !invitations.mine.length,
    onSelect: () => void router.push('/organizacoes/nova'),
  },
  {
    label: 'Todas as organizações',
    icon: Building2,
    onSelect: () => void router.push('/organizacoes'),
  },
])

function chooseOrganization(id: string) {
  if (id === current.value?.id) return
  organizations.select(id)
  void router.push('/')
}

// páginas sem guard abrem sem o usuário carregado: confere a sessão
onMounted(async () => {
  if (!auth.user) await auth.loadUser().catch(() => undefined)
  if (auth.user && !organizations.organizations.length) {
    await organizations.load().catch(() => undefined)
  }
})

// trocou de organização (ou de conta): os setores do menu passam a ser os dela
watch(
  () => [auth.user?.id, current.value?.id] as const,
  ([user, id]) => {
    if (user && id) void sectors.load(id).catch(() => undefined)
  },
  { immediate: true },
)

const linkClass = (active: boolean) => [
  'group relative flex h-8 items-center gap-2.5 rounded-control px-2 text-13 font-medium outline-none',
  'transition-colors duration-(--dur-fast) ease-out focus-visible:outline-2 focus-visible:outline-accent',
  active ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
]
</script>

<template>
  <aside
    :class="[
      'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface-1 md:flex',
      collapsed ? 'w-14' : 'w-60',
    ]"
    aria-label="Barra lateral"
  >
    <div :class="['flex h-12 items-center gap-2 px-3', collapsed ? 'justify-center' : '']">
      <RouterLink
        to="/"
        class="flex items-center gap-2 rounded-control"
        aria-label="Inceptum: início"
      >
        <img src="/icons/logo.svg" alt="" class="size-6 rounded-[4px]" />
        <span
          v-if="!collapsed"
          class="ui-label-in text-13 font-semibold tracking-[0.2em] text-fg uppercase"
        >
          Inceptum
        </span>
      </RouterLink>
    </div>

    <div v-if="auth.user" :class="['px-2 pb-2', collapsed ? 'flex justify-center' : '']">
      <UiMenu :items="orgMenu" label="Organizações" :class="collapsed ? '' : 'flex w-full'">
        <template #trigger="{ props: trigger }">
          <button
            v-bind="trigger"
            data-ui="org-switcher"
            type="button"
            :aria-label="`Organização: ${current ? orgLabel(current.name, current.is_personal) : 'nenhuma'}. Trocar`"
            :class="[
              'relative flex cursor-pointer items-center gap-2 rounded-control border border-border bg-surface-2 text-left',
              'transition-colors duration-(--dur-fast) ease-out hover:border-border-strong',
              collapsed ? 'size-9 justify-center' : 'h-10 w-full px-2',
            ]"
          >
            <span
              class="grid size-6 shrink-0 place-items-center rounded-[4px] bg-surface-3 text-12 font-semibold text-fg"
              aria-hidden="true"
            >
              {{ initial(current?.name ?? '') }}
            </span>
            <span v-if="!collapsed" class="ui-label-in min-w-0 flex-1">
              <span class="block truncate text-13 font-medium text-fg">
                {{ current ? orgLabel(current.name, current.is_personal) : 'Sem organização' }}
              </span>
            </span>
            <UiIcon v-if="!collapsed" :icon="ChevronsUpDown" :size="14" class="text-fg-muted" />
            <span
              v-if="invitations.mine.length"
              class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent"
              aria-hidden="true"
            />
          </button>
        </template>
      </UiMenu>
    </div>

    <nav aria-label="Navegação principal" class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      <ul v-if="auth.user" class="grid gap-0.5">
        <li v-for="item in workspaceNav" :key="item.to">
          <UiTooltip :text="item.label" placement="right" :disabled="!collapsed" class="flex">
            <RouterLink
              :to="item.to"
              :aria-current="isNavActive(item, route.path) ? 'page' : undefined"
              :aria-label="collapsed ? item.label : undefined"
              :class="[
                linkClass(isNavActive(item, route.path)),
                collapsed ? 'w-10 justify-center' : '',
              ]"
            >
              <UiIcon
                :icon="item.icon"
                :class="isNavActive(item, route.path) ? 'text-accent' : ''"
              />
              <span v-if="!collapsed" class="ui-label-in flex-1 truncate">{{ item.label }}</span>
              <span
                v-if="badge(item) && !collapsed"
                class="font-mono text-12 text-fg-muted tabular-nums"
                :aria-label="`${badge(item)} não lidas`"
              >
                {{ badge(item) > 99 ? '99+' : badge(item) }}
              </span>
              <span
                v-else-if="badge(item)"
                class="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent"
                aria-label="Há itens não lidos"
              />
            </RouterLink>
          </UiTooltip>
        </li>
      </ul>

      <template v-if="auth.user && visibleSectors.length">
        <h2 v-if="!collapsed" class="ui-label-in mt-5 mb-1 px-2 text-12 font-medium text-fg-muted">
          Setores
        </h2>
        <div v-else class="mx-2 my-3 h-px bg-border" role="separator" />
        <ul class="grid gap-0.5">
          <li v-for="sector in visibleSectors" :key="sector.id">
            <RouterLink
              :to="`/setores/${sector.id}`"
              :aria-current="sectorActive(sector.id) ? 'page' : undefined"
              :aria-label="collapsed ? sector.name : undefined"
              :title="collapsed ? sector.name : undefined"
              :class="[linkClass(sectorActive(sector.id)), collapsed ? 'w-10 justify-center' : '']"
            >
              <span class="grid size-4 place-items-center" aria-hidden="true">
                <span
                  class="size-2 rounded-full bg-fg-muted"
                  :style="sector.color ? { backgroundColor: sector.color } : undefined"
                />
              </span>
              <span v-if="!collapsed" class="ui-label-in flex-1 truncate">{{ sector.name }}</span>
            </RouterLink>
          </li>
        </ul>
      </template>
    </nav>

    <div class="border-t border-border p-2">
      <ul v-if="auth.user" class="mb-1 grid gap-0.5">
        <li v-for="item in accountNav" :key="item.to">
          <RouterLink
            :to="item.to"
            :aria-current="isNavActive(item, route.path) ? 'page' : undefined"
            :aria-label="collapsed ? item.label : undefined"
            :title="collapsed ? item.label : undefined"
            :class="[
              linkClass(isNavActive(item, route.path)),
              collapsed ? 'w-10 justify-center' : '',
            ]"
          >
            <UiIcon :icon="item.icon" :class="isNavActive(item, route.path) ? 'text-accent' : ''" />
            <span v-if="!collapsed" class="ui-label-in flex-1 truncate">{{ item.label }}</span>
            <span
              v-if="badge(item) && !collapsed"
              class="font-mono text-12 text-fg-muted tabular-nums"
            >
              {{ badge(item) > 99 ? '99+' : badge(item) }}
            </span>
            <span
              v-else-if="badge(item)"
              class="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent"
              aria-hidden="true"
            />
          </RouterLink>
        </li>
      </ul>
      <div :class="['flex', collapsed ? 'justify-center' : 'justify-end']">
        <UiIconButton
          :icon="collapsed ? PanelLeftOpen : PanelLeftClose"
          :label="collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'"
          size="sm"
          @click="collapsed = !collapsed"
        />
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* rótulos reaparecem com fade quando a barra expande (a largura muda sem animar) */
.ui-label-in {
  animation: ui-label-in var(--dur-base) var(--ease-out);
}

@keyframes ui-label-in {
  from {
    opacity: 0;
  }
}
</style>

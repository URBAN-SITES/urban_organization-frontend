<script setup lang="ts">
import { Building2, Check, ChevronsUpDown, Mail, Plus } from '@lucide/vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import { useChatStore } from '@/modules/chat'
import { useInvitationsStore } from '@/modules/invitations'
import { useSectorsStore } from '@/modules/module'
import { useNotificationsStore } from '@/modules/notifications'
import { useOrganizationsStore } from '@/modules/organizations'
import { UiIcon, UiMenu, type MenuItem } from '@/shared/components'
import { accountNav, isNavActive, workspaceGroups, type NavItem } from '../navigation'
import SidebarLink from './SidebarLink.vue'

/** Conteúdo da navegação: o mesmo na barra lateral (desktop) e no menu do celular. */
const { collapsed = false, size = 'md' } = defineProps<{
  collapsed?: boolean
  size?: 'md' | 'lg'
}>()

const MAX_SECTORS = 8

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const sectors = useSectorsStore()
const chat = useChatStore()
const notifications = useNotificationsStore()
const invitations = useInvitationsStore()

const current = computed(() => organizations.current)
const orgLabel = (name: string, personal: boolean) => (personal ? 'Espaço pessoal' : name)
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'
const visibleSectors = computed(() => sectors.sectors.slice(0, MAX_SECTORS))
const sectorActive = (id: string) => route.path.startsWith(`/setores/${id}`)
const projectsLink = computed(() =>
  current.value ? `/organizacoes/${current.value.id}/projetos` : '/organizacoes',
)

const groups = computed(() => [
  ...workspaceGroups,
  { id: 'account', label: 'Conta', items: accountNav },
])

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
</script>

<template>
  <div v-if="auth.user" class="flex min-h-0 flex-1 flex-col">
    <div class="px-2 pb-3">
      <UiMenu :items="orgMenu" label="Organizações" class="flex w-full">
        <template #trigger="{ props: trigger }">
          <button
            v-bind="trigger"
            data-ui="org-switcher"
            type="button"
            :aria-label="`Organização: ${current ? orgLabel(current.name, current.is_personal) : 'nenhuma'}. Trocar`"
            :class="[
              'flex w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-control border border-border bg-surface-2/60 pr-2 pl-[7px] text-left',
              'transition-[background-color,border-color,scale] duration-(--dur-fast) ease-out',
              'hover:border-border-strong hover:bg-surface-2 active:scale-[0.98]',
              'focus-visible:outline-2 focus-visible:outline-accent',
              size === 'lg' ? 'h-12' : 'h-10',
            ]"
          >
            <span
              class="relative grid size-6 shrink-0 place-items-center rounded-[5px] bg-fg text-12 font-semibold text-bg"
              aria-hidden="true"
            >
              {{ initial(current?.name ?? '') }}
              <span
                v-if="invitations.mine.length"
                class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent ring-2 ring-surface-1"
              />
            </span>
            <span class="sidebar-label min-w-0 flex-1">
              <span class="block truncate text-13 leading-4 font-medium text-fg">
                {{ current ? orgLabel(current.name, current.is_personal) : 'Sem organização' }}
              </span>
              <span class="block truncate text-12 leading-4 text-fg-muted">
                {{ organizations.organizations.length }}
                {{ organizations.organizations.length === 1 ? 'organização' : 'organizações' }}
              </span>
            </span>
            <UiIcon
              :icon="ChevronsUpDown"
              :size="14"
              class="sidebar-label shrink-0 text-fg-muted"
            />
          </button>
        </template>
      </UiMenu>
    </div>

    <nav
      aria-label="Navegação principal"
      class="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3"
    >
      <section v-for="group in groups" :key="group.id" class="mb-3">
        <!-- altura fixa: ao recolher, o título vira um traço sem empurrar os itens -->
        <h2
          class="sidebar-group relative flex h-7 items-center px-3 text-12 font-medium text-fg-muted"
        >
          <span class="sidebar-label truncate">{{ group.label }}</span>
          <span class="sidebar-rule absolute left-3 h-px w-4 bg-border-strong" aria-hidden="true" />
        </h2>
        <ul class="grid gap-0.5">
          <li v-for="item in group.items" :key="item.to">
            <SidebarLink
              :to="item.to"
              :label="item.label"
              :icon="item.icon"
              :active="isNavActive(item, route.path)"
              :collapsed="collapsed"
              :badge="badge(item)"
              :size="size"
            />
          </li>
        </ul>

        <!-- os projetos entram logo depois do grupo de trabalho -->
        <template v-if="group.id === 'workspace' && visibleSectors.length">
          <h2
            class="sidebar-group relative mt-3 flex h-7 items-center justify-between px-3 text-12 font-medium text-fg-muted"
          >
            <span class="sidebar-label truncate">Projetos</span>
            <RouterLink
              :to="projectsLink"
              class="sidebar-label rounded-[4px] text-12 text-fg-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Ver todos
            </RouterLink>
            <span
              class="sidebar-rule absolute left-3 h-px w-4 bg-border-strong"
              aria-hidden="true"
            />
          </h2>
          <ul class="grid gap-0.5">
            <li v-for="sector in visibleSectors" :key="sector.id">
              <SidebarLink
                :to="`/setores/${sector.id}`"
                :label="sector.name"
                :color="sector.color"
                :active="sectorActive(sector.id)"
                :collapsed="collapsed"
                :size="size"
              />
            </li>
          </ul>
        </template>
      </section>
    </nav>
  </div>
</template>

<style>
/*
 * Modo recolhido (AppSidebar marca data-collapsed): a largura muda sem animar layout,
 * os rótulos somem e voltam com fade e os títulos dos grupos viram um traço curto.
 */
.sidebar-label {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out),
    visibility 0s;
}

[data-collapsed] .sidebar-label {
  visibility: hidden;
  opacity: 0;
  transform: translateX(calc(-4px * var(--motion-on)));
  transition:
    opacity var(--dur-fast-exit) var(--ease-in),
    transform var(--dur-fast-exit) var(--ease-in),
    visibility 0s linear var(--dur-fast-exit);
}

.sidebar-rule {
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-out);
}

[data-collapsed] .sidebar-rule {
  opacity: 1;
}

.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--ds-border-strong) transparent;
}
</style>

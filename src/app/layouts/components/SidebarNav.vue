<script setup lang="ts">
import { Building2, Check, ChevronsUpDown, Mail, Plus } from '@lucide/vue'
import { useResizeObserver, useStorage } from '@vueuse/core'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import { useChatStore } from '@/modules/chat'
import { useInvitationsStore } from '@/modules/invitations'
import { useSectorsStore } from '@/modules/module'
import { useOrganizationsStore } from '@/modules/organizations'
import { UiMenu, type MenuItem } from '@/shared/components'
import { isNavActive, sidebarGroups, type NavItem } from '../navigation'
import SidebarFavorites from './SidebarFavorites.vue'
import SidebarLink from './SidebarLink.vue'

/** Conteúdo da navegação: o mesmo na barra lateral (desktop) e no menu do celular. */
const { collapsed = false, size = 'md' } = defineProps<{
  collapsed?: boolean
  size?: 'md' | 'lg'
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const sectors = useSectorsStore()
const chat = useChatStore()
const invitations = useInvitationsStore()

const current = computed(() => organizations.current)
const orgLabel = (name: string, personal: boolean) => (personal ? 'Espaço pessoal' : name)
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'
const view = computed(() => (typeof route.query.view === 'string' ? route.query.view : ''))

// projeto em contexto para Tarefas, Kanban e Reuniões: o aberto, o último aberto, um fixado
const lastProject = useStorage<string | null>('urban:sidebar-last-project', null)
const openProject = computed(() => {
  const match = /^\/setores\/([^/]+)$/.exec(route.path)
  return match ? match[1]! : null
})
watch(openProject, (id) => id && (lastProject.value = id), { immediate: true })
const contextProject = computed(() => {
  const ids = sectors.sectors.map((sector) => sector.id)
  if (openProject.value) return openProject.value
  if (lastProject.value && ids.includes(lastProject.value)) return lastProject.value
  return sectors.sectors.find((sector) => sector.is_favorite)?.id ?? ids[0] ?? null
})

const groups = computed(() =>
  sidebarGroups({
    projectsPath: current.value ? `/organizacoes/${current.value.id}/projetos` : '/organizacoes',
    projectId: contextProject.value,
  }),
)

const active = (item: NavItem) => isNavActive(item, route.path, view.value)
const badge = (item: NavItem) => (item.to === '/chat' ? chat.unreadTotal : 0)

// traço laranja da rota atual: um só elemento que desliza até o item ativo
const nav = useTemplateRef<HTMLElement>('nav')
const indicator = ref<{ top: number; height: number } | null>(null)
function placeIndicator() {
  const link = nav.value?.querySelector<HTMLElement>('.sb-link[data-active]')
  // o traço ocupa o meio do item, sem encostar nas bordas arredondadas
  indicator.value = link
    ? { top: link.offsetTop + link.offsetHeight * 0.22, height: link.offsetHeight * 0.56 }
    : null
}
watch(
  () => [route.fullPath, collapsed, sectors.sectors.length],
  () => void nextTick(placeIndicator),
  { immediate: true },
)
useResizeObserver(nav, placeIndicator)

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
    <div class="px-3 pb-2">
      <UiMenu :items="orgMenu" label="Organizações" class="flex w-full">
        <template #trigger="{ props: trigger, open }">
          <button
            v-bind="trigger"
            data-ui="org-switcher"
            type="button"
            :aria-label="`Organização: ${current ? orgLabel(current.name, current.is_personal) : 'nenhuma'}. Trocar`"
            :class="['sb-org', size === 'lg' ? 'h-12' : 'h-11', { 'is-open': open }]"
          >
            <span class="sb-org-mark" aria-hidden="true">
              {{ initial(current?.name ?? '') }}
              <span v-if="invitations.mine.length" class="sb-dot" />
            </span>
            <span class="sidebar-label min-w-0 flex-1 text-left">
              <span class="block truncate text-13 leading-4 font-medium text-white">
                {{ current ? orgLabel(current.name, current.is_personal) : 'Sem organização' }}
              </span>
              <span class="block truncate text-12 leading-4 text-[var(--sb-muted)]">
                {{ organizations.organizations.length }}
                {{ organizations.organizations.length === 1 ? 'organização' : 'organizações' }}
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

    <nav ref="nav" aria-label="Navegação principal" class="sb-scroll relative min-h-0 flex-1 px-3">
      <span
        v-if="indicator"
        class="sb-indicator"
        :style="{ transform: `translateY(${indicator.top}px)`, height: `${indicator.height}px` }"
        aria-hidden="true"
      />
      <section v-for="group in groups" :key="group.id" class="sb-group">
        <h2 class="sb-group-title">
          <span class="sidebar-label">{{ group.label }}</span>
        </h2>
        <ul class="grid gap-0.5">
          <li v-for="item in group.items" :key="item.label">
            <SidebarLink
              :to="item.to"
              :label="item.label"
              :icon="item.icon"
              :active="active(item)"
              :collapsed="collapsed"
              :badge="badge(item)"
              :size="size"
            />
          </li>
        </ul>
      </section>

      <SidebarFavorites :collapsed="collapsed" :size="size" />
    </nav>
  </div>
</template>

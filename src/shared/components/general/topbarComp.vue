<script setup lang="ts">
import { Bell, ChevronRight, LogOut, Search, Settings } from '@lucide/vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useShell } from '../../composables/shell'
import UiAvatar from '../ui/UiAvatar.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiMenu, { type MenuItem } from '../ui/UiMenu.vue'

/* COMO USAR:
  <TopbarComp :crumbs="['Conta', 'Configurações']" />
  Cabeçalho das telas: caminho (a organização atual vem na frente), busca global
  (Ctrl/Cmd+K), tema, notificações e menu do usuário. `showSearch` adiciona um
  filtro local da tela, ligado a v-model:search.
*/

const props = withDefaults(
  defineProps<{ crumbs: string[]; showSearch?: boolean; searchPlaceholder?: string }>(),
  {
    showSearch: false,
    searchPlaceholder: 'Filtrar nesta tela',
  },
)

const search = defineModel<string>('search', { default: '' })
const shell = useShell()
const router = useRouter()
const path = computed(() =>
  shell.organization.value ? [shell.organization.value, ...props.crumbs] : props.crumbs,
)
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const userMenu = computed<MenuItem[]>(() => [
  { label: 'Configurações', icon: Settings, onSelect: () => void router.push('/configuracoes') },
  {
    label: 'Sair da conta',
    icon: LogOut,
    separatorBefore: true,
    onSelect: () => void shell.signOut(),
  },
])
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-bg px-4 sm:px-6"
  >
    <nav aria-label="Navegação estrutural" class="min-w-0 flex-1">
      <ol class="flex items-center gap-1.5 text-13 text-fg-muted">
        <li
          v-for="(crumb, index) in path"
          :key="`${index}-${crumb}`"
          :class="[
            'flex min-w-0 items-center gap-1.5',
            // no mobile só o último nível cabe
            index < path.length - 1 ? 'max-sm:hidden' : '',
          ]"
        >
          <UiIcon v-if="index > 0" :icon="ChevronRight" :size="14" class="max-sm:hidden" />
          <span
            :class="['truncate', index === path.length - 1 ? 'font-medium text-fg' : '']"
            :aria-current="index === path.length - 1 ? 'page' : undefined"
          >
            {{ crumb }}
          </span>
        </li>
      </ol>
    </nav>

    <label v-if="showSearch" class="relative hidden md:block">
      <span class="sr-only">{{ searchPlaceholder }}</span>
      <UiIcon
        :icon="Search"
        :size="14"
        class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg-muted"
      />
      <input
        v-model="search"
        type="search"
        :placeholder="searchPlaceholder"
        class="h-8 w-56 rounded-control border border-border bg-surface-2 pr-2 pl-8 text-13 text-fg placeholder:text-fg-muted focus-visible:border-accent focus-visible:outline-none"
      />
    </label>

    <button
      data-ui="palette-trigger"
      type="button"
      class="hidden h-8 cursor-pointer items-center gap-2 rounded-control border border-border bg-surface-2 pr-1.5 pl-2.5 text-13 text-fg-muted transition-colors duration-(--dur-fast) ease-out hover:border-border-strong hover:text-fg sm:flex"
      aria-keyshortcuts="Control+K Meta+K"
      @click="shell.openPalette()"
    >
      <UiIcon :icon="Search" :size="14" />
      <span class="hidden lg:inline">Buscar ou ir para…</span>
      <kbd class="rounded-[4px] border border-border px-1 font-mono text-12">
        {{ isMac ? '⌘K' : 'Ctrl K' }}
      </kbd>
    </button>
    <UiIconButton
      :icon="Search"
      label="Buscar ou ir para"
      class="sm:hidden"
      @click="shell.openPalette()"
    />

    <RouterLink
      to="/notificacoes"
      class="relative inline-grid size-8 place-items-center rounded-control text-fg-muted transition-colors duration-(--dur-fast) ease-out hover:bg-surface-2 hover:text-fg"
      :aria-label="
        shell.unread.value ? `Notificações: ${shell.unread.value} não lidas` : 'Notificações'
      "
    >
      <UiIcon :icon="Bell" />
      <span
        v-if="shell.unread.value"
        class="absolute top-1 right-1 grid min-w-3.5 place-items-center rounded-full bg-accent px-0.5 font-mono text-[10px] leading-3.5 text-accent-fg"
        aria-hidden="true"
      >
        {{ shell.unread.value > 9 ? '9+' : shell.unread.value }}
      </span>
    </RouterLink>

    <UiMenu v-if="shell.user.value" :items="userMenu" label="Conta" placement="bottom-end">
      <template #trigger="{ props: trigger }">
        <button
          v-bind="trigger"
          data-ui="user-menu"
          type="button"
          class="ml-1 cursor-pointer rounded-full"
          :aria-label="`Conta de ${shell.user.value.name || shell.user.value.email}`"
        >
          <UiAvatar
            :name="shell.user.value.name || shell.user.value.email"
            :src="shell.user.value.avatarUrl"
            size="sm"
          />
        </button>
      </template>
    </UiMenu>
  </header>
</template>

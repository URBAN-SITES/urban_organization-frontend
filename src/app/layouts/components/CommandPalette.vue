<script setup lang="ts">
import { CornerDownLeft, LogOut, Moon, Plus, Search, SquareKanban, Sun } from '@lucide/vue'
import { useEventListener } from '@vueuse/core'
import { computed, nextTick, ref, useId, useTemplateRef, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from '@/app/composables/useTheme'
import { useSectorsStore } from '@/modules/module'
import { UiIcon } from '@/shared/components'
import { useModalLayer } from '@/shared/composables/overlay'
import { accountNav, workspaceNav } from '../navigation'

interface Command {
  id: string
  group: 'Navegar' | 'Projetos' | 'Ações'
  label: string
  icon: Component
  keywords?: string
  run: () => void
}

/** Ctrl/Cmd+K: navegação entre telas, setores e ações rápidas. */
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ signOut: [] }>()

const router = useRouter()
const sectors = useSectorsStore()
const { isDark, toggleTheme } = useTheme()

const query = ref('')
const activeIndex = ref(0)
const panel = useTemplateRef<HTMLElement>('panel')
const input = useTemplateRef<HTMLInputElement>('input')
const listId = useId()

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const commands = computed<Command[]>(() => [
  ...[...workspaceNav, ...accountNav].map((item) => ({
    id: `nav:${item.to}`,
    group: 'Navegar' as const,
    label: item.label,
    icon: item.icon,
    keywords: item.keywords,
    run: () => void router.push(item.to),
  })),
  ...sectors.sectors.map((sector) => ({
    id: `sector:${sector.id}`,
    group: 'Projetos' as const,
    label: sector.name,
    icon: SquareKanban,
    keywords: 'setor projeto quadro kanban',
    run: () => void router.push(`/setores/${sector.id}`),
  })),
  {
    id: 'action:theme',
    group: 'Ações',
    label: isDark.value ? 'Usar tema claro' : 'Usar tema escuro',
    icon: isDark.value ? Sun : Moon,
    keywords: 'tema claro escuro aparencia',
    run: toggleTheme,
  },
  {
    id: 'action:new-org',
    group: 'Ações',
    label: 'Nova organização',
    icon: Plus,
    keywords: 'criar workspace',
    run: () => void router.push('/organizacoes/nova'),
  },
  {
    id: 'action:sign-out',
    group: 'Ações',
    label: 'Sair da conta',
    icon: LogOut,
    keywords: 'logout encerrar sessao',
    run: () => emit('signOut'),
  },
])

const results = computed(() => {
  const terms = normalize(query.value).split(/\s+/).filter(Boolean)
  if (!terms.length) return commands.value
  return commands.value.filter((command) => {
    const haystack = normalize(`${command.label} ${command.keywords ?? ''} ${command.group}`)
    return terms.every((term) => haystack.includes(term))
  })
})

const groups = computed(() => {
  const map = new Map<string, { command: Command; index: number }[]>()
  results.value.forEach((command, index) => {
    map.set(command.group, [...(map.get(command.group) ?? []), { command, index }])
  })
  return [...map.entries()]
})

watch(query, () => (activeIndex.value = 0))
watch(open, (value) => {
  if (value) {
    query.value = ''
    activeIndex.value = 0
  }
})

function close() {
  open.value = false
}

function runAt(index: number) {
  const command = results.value[index]
  if (!command) return
  close()
  command.run()
}

async function move(delta: number) {
  const count = results.value.length
  if (!count) return
  activeIndex.value = (activeIndex.value + delta + count) % count
  await nextTick()
  document.getElementById(`${listId}-${activeIndex.value}`)?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') void move(1)
  else if (event.key === 'ArrowUp') void move(-1)
  else if (event.key === 'Enter') runAt(activeIndex.value)
  else return
  event.preventDefault()
}

useModalLayer(open, panel, close, { initialFocus: () => input.value })

// atalho global
useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey) {
    event.preventDefault()
    open.value = !open.value
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-fade">
      <div v-if="open" class="fixed inset-0 z-50 bg-overlay" aria-hidden="true" @click="close" />
    </Transition>
    <Transition name="ui-modal">
      <div
        v-if="open"
        class="pointer-events-none fixed inset-0 z-50 flex justify-center px-4 pt-[12vh]"
      >
        <section
          ref="panel"
          role="dialog"
          aria-modal="true"
          aria-label="Paleta de comandos"
          class="pointer-events-auto flex max-h-[60vh] w-full max-w-xl flex-col self-start overflow-hidden rounded-modal border border-border bg-surface-1 shadow-modal"
        >
          <div class="flex items-center gap-2 border-b border-border px-4">
            <UiIcon :icon="Search" class="text-fg-muted" />
            <input
              ref="input"
              v-model="query"
              type="text"
              role="combobox"
              aria-label="Buscar telas, projetos e ações"
              aria-autocomplete="list"
              :aria-expanded="true"
              :aria-controls="listId"
              :aria-activedescendant="results.length ? `${listId}-${activeIndex}` : undefined"
              placeholder="Buscar telas, projetos e ações…"
              class="h-12 flex-1 bg-transparent text-14 text-fg outline-none placeholder:text-fg-muted"
              @keydown="onKeydown"
            />
            <kbd class="rounded-[4px] border border-border px-1.5 font-mono text-12 text-fg-muted">
              Esc
            </kbd>
          </div>
          <div :id="listId" role="listbox" aria-label="Resultados" class="overflow-y-auto p-1.5">
            <p v-if="!results.length" class="px-3 py-8 text-center text-13 text-fg-muted">
              Nada encontrado para “{{ query }}”.
            </p>
            <div v-for="[group, items] in groups" :key="group" role="group" :aria-label="group">
              <p class="px-2.5 pt-2 pb-1 text-12 font-medium text-fg-muted" aria-hidden="true">
                {{ group }}
              </p>
              <div
                v-for="{ command, index } in items"
                :id="`${listId}-${index}`"
                :key="command.id"
                role="option"
                :aria-selected="index === activeIndex"
                :class="[
                  'flex h-9 cursor-pointer items-center gap-2.5 rounded-control px-2.5 text-13',
                  index === activeIndex ? 'bg-surface-2 text-fg' : 'text-fg-muted',
                ]"
                @pointermove="activeIndex = index"
                @click="runAt(index)"
              >
                <UiIcon :icon="command.icon" />
                <span class="flex-1 truncate">{{ command.label }}</span>
                <UiIcon
                  v-if="index === activeIndex"
                  :icon="CornerDownLeft"
                  :size="14"
                  class="text-fg-muted"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { nextTick, ref, useId, useTemplateRef, type Component } from 'vue'
import { useFloating, type Placement } from '@/shared/composables/floating'
import UiIcon from './UiIcon.vue'

export interface MenuItem {
  label: string
  icon?: Component
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  /** item anterior recebe uma linha divisória */
  separatorBefore?: boolean
  onSelect: () => void
}

/**
 * Menu suspenso (padrão "menu button" da WAI-ARIA).
 * O gatilho vem no slot `trigger` e recebe `props` para espalhar com v-bind.
 */
const {
  items,
  placement = 'bottom-start',
  label,
} = defineProps<{
  items: MenuItem[]
  label: string
  placement?: Placement
}>()

const open = ref(false)
const anchor = useTemplateRef<HTMLElement>('anchor')
const panel = useTemplateRef<HTMLElement>('panel')
const menuId = useId()
const triggerId = useId()
const { style } = useFloating(anchor, panel, open, placement)

function itemEls(): HTMLElement[] {
  return [
    ...(panel.value?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []),
  ]
}

async function show(focus: 'first' | 'last' = 'first') {
  open.value = true
  await nextTick()
  const els = itemEls()
  ;(focus === 'first' ? els[0] : els[els.length - 1])?.focus()
}

function hide(returnFocus = true) {
  open.value = false
  if (returnFocus) document.getElementById(triggerId)?.focus()
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    void show('first')
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    void show('last')
  }
}

function onMenuKeydown(event: KeyboardEvent) {
  const els = itemEls()
  const index = els.indexOf(document.activeElement as HTMLElement)
  const move = (to: number) => els[(to + els.length) % els.length]?.focus()
  if (event.key === 'ArrowDown') move(index + 1)
  else if (event.key === 'ArrowUp') move(index - 1)
  else if (event.key === 'Home') move(0)
  else if (event.key === 'End') move(els.length - 1)
  else if (event.key === 'Escape') hide()
  else if (event.key === 'Tab') return hide(false)
  else if (event.key.length === 1 && /\S/.test(event.key)) {
    // typeahead: próximo item que começa com a letra
    const start = index + 1
    const ordered = [...els.slice(start), ...els.slice(0, start)]
    ordered
      .find((el) => el.textContent?.trim().toLowerCase().startsWith(event.key.toLowerCase()))
      ?.focus()
  } else return
  event.preventDefault()
}

function select(item: MenuItem) {
  if (item.disabled) return
  hide()
  item.onSelect()
}

onClickOutside(panel, () => open.value && hide(false), { ignore: [anchor] })

const triggerProps = {
  id: triggerId,
  'aria-haspopup': 'menu' as const,
  'aria-controls': menuId,
  onKeydown: onTriggerKeydown,
  onClick: () => (open.value ? hide() : void show()),
}
</script>

<template>
  <span ref="anchor" class="inline-flex">
    <slot name="trigger" :props="{ ...triggerProps, 'aria-expanded': open }" :open="open" />
  </span>
  <Teleport to="body">
    <Transition name="ui-pop">
      <div
        v-if="open"
        :id="menuId"
        ref="panel"
        role="menu"
        :aria-label="label"
        :aria-labelledby="triggerId"
        :style="style"
        class="z-50 min-w-48 rounded-card border border-border bg-surface-1 p-1 shadow-float"
        @keydown="onMenuKeydown"
      >
        <template v-for="item in items" :key="item.label">
          <div v-if="item.separatorBefore" role="separator" class="my-1 h-px bg-border" />
          <button
            data-ui="menu-item"
            type="button"
            role="menuitem"
            tabindex="-1"
            :disabled="item.disabled"
            :class="[
              'flex h-8 w-full cursor-pointer items-center gap-2 rounded-control px-2 text-left text-13 outline-none',
              'transition-colors duration-(--dur-fast) ease-out',
              'hover:bg-surface-2 focus-visible:bg-surface-2 focus:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50',
              item.danger ? 'text-danger' : 'text-fg',
            ]"
            @click="select(item)"
          >
            <UiIcon v-if="item.icon" :icon="item.icon" class="text-fg-muted" />
            <span class="flex-1 truncate">{{ item.label }}</span>
            <kbd v-if="item.shortcut" class="font-mono text-12 text-fg-muted">{{
              item.shortcut
            }}</kbd>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onClickOutside, useEventListener } from '@vueuse/core'
import { nextTick, useId, useTemplateRef } from 'vue'
import { useFloating, type Placement } from '@/shared/composables/floating'
import { focusableIn } from '@/shared/composables/focusTrap'

/**
 * Conteúdo flutuante não modal (filtros, seletores). Abre pelo gatilho do slot
 * `trigger`; fecha com Esc (devolvendo o foco), clique fora ou `close()` do slot.
 */
const open = defineModel<boolean>('open', { default: false })
const { placement = 'bottom-start', label } = defineProps<{
  label: string
  placement?: Placement
}>()

const anchor = useTemplateRef<HTMLElement>('anchor')
const panel = useTemplateRef<HTMLElement>('panel')
const panelId = useId()
const triggerId = useId()
const { style } = useFloating(anchor, panel, open, placement)

async function toggle() {
  open.value = !open.value
  if (!open.value) return
  await nextTick()
  const target = panel.value ? (focusableIn(panel.value)[0] ?? panel.value) : null
  target?.focus()
}

function close(returnFocus = true) {
  open.value = false
  if (returnFocus) document.getElementById(triggerId)?.focus()
}

onClickOutside(panel, () => open.value && close(false), { ignore: [anchor] })
useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape' && open.value) close()
})
</script>

<template>
  <span ref="anchor" class="inline-flex">
    <slot
      name="trigger"
      :props="{
        id: triggerId,
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        'aria-controls': panelId,
        onClick: toggle,
      }"
      :open="open"
    />
  </span>
  <Teleport to="body">
    <Transition name="ui-pop">
      <div
        v-if="open"
        :id="panelId"
        ref="panel"
        role="dialog"
        :aria-label="label"
        tabindex="-1"
        :style="style"
        class="z-50 min-w-56 rounded-card border border-border bg-surface-1 p-3 text-14 text-fg shadow-float outline-none"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </Teleport>
</template>

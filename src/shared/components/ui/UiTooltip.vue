<script setup lang="ts">
import { onBeforeUnmount, ref, useId, useTemplateRef } from 'vue'
import { useFloating, type Placement } from '@/shared/composables/floating'

/**
 * Dica curta ao passar o mouse ou focar pelo teclado. Esc fecha.
 * Só para informação complementar: nunca coloque ações dentro.
 */
const {
  text,
  placement = 'top',
  delay = 400,
} = defineProps<{
  text: string
  placement?: Placement
  delay?: number
}>()

const open = ref(false)
const anchor = useTemplateRef<HTMLElement>('anchor')
const tip = useTemplateRef<HTMLElement>('tip')
const tipId = useId()
const { style } = useFloating(anchor, tip, open, placement)
let timer: number | undefined

function show(immediate = false) {
  window.clearTimeout(timer)
  if (immediate) open.value = true
  else timer = window.setTimeout(() => (open.value = true), delay)
}
function hide() {
  window.clearTimeout(timer)
  open.value = false
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.stopPropagation()
    hide()
  }
}
onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <span
    ref="anchor"
    class="inline-flex"
    :aria-describedby="open ? tipId : undefined"
    @pointerenter="show()"
    @pointerleave="hide"
    @focusin="show(true)"
    @focusout="hide"
    @keydown="onKeydown"
  >
    <slot />
  </span>
  <Teleport to="body">
    <Transition name="ui-tip">
      <div
        v-if="open"
        :id="tipId"
        ref="tip"
        role="tooltip"
        :style="style"
        class="pointer-events-none z-60 max-w-64 rounded-control bg-fg px-2 py-1 text-12 text-bg shadow-float"
      >
        {{ text }}
      </div>
    </Transition>
  </Teleport>
</template>

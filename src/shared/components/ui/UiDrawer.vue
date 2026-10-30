<script setup lang="ts">
import { X } from '@lucide/vue'
import { useId, useTemplateRef } from 'vue'
import { useModalLayer } from '@/shared/composables/overlay'
import UiIconButton from './UiIconButton.vue'

/** Painel lateral (ou inferior no mobile, com side="bottom"). Mesmo comportamento do Dialog. */
const open = defineModel<boolean>('open', { required: true })
const { side = 'right', width = 'md' } = defineProps<{
  title: string
  description?: string
  side?: 'right' | 'left' | 'bottom'
  width?: 'sm' | 'md' | 'lg'
}>()
const emit = defineEmits<{ close: [] }>()

const panel = useTemplateRef<HTMLElement>('panel')
const titleId = useId()

function close() {
  open.value = false
  emit('close')
}

useModalLayer(open, panel, close)

const WIDTHS = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-2xl' } as const
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-fade">
      <div v-if="open" class="fixed inset-0 z-50 bg-overlay" aria-hidden="true" @click="close" />
    </Transition>
    <Transition :name="`ui-drawer-${side}`">
      <section
        v-if="open"
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        :class="[
          'ui-drawer-panel fixed z-50 flex flex-col border-border bg-surface-1 shadow-modal outline-none',
          side === 'bottom'
            ? 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-modal border-t'
            : [
                'inset-y-0 w-full',
                WIDTHS[width],
                side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              ],
        ]"
      >
        <header class="ui-drawer-head flex items-start gap-3 border-b border-border px-5 py-4">
          <div class="min-w-0 flex-1">
            <h2 :id="titleId" class="truncate text-16 font-semibold text-fg">{{ title }}</h2>
            <p v-if="description" class="mt-0.5 text-13 text-fg-muted">{{ description }}</p>
          </div>
          <UiIconButton :icon="X" label="Fechar" size="sm" class="-mr-2" @click="close" />
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto p-5 text-14 text-fg">
          <slot />
        </div>
        <footer
          v-if="$slots.footer"
          class="flex justify-end gap-2 border-t border-border px-5 py-3"
        >
          <slot name="footer" />
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>

<style>
/* brilho quente discreto no topo dos painéis laterais, como no login */
.ui-drawer-head {
  background: radial-gradient(80% 140% at 0% 0%, var(--ds-glow), transparent 70%);
}
</style>

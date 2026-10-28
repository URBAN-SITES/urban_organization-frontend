<script setup lang="ts">
import { X } from '@lucide/vue'
import { useId, useTemplateRef } from 'vue'
import { focusableIn } from '@/shared/composables/focusTrap'
import { useModalLayer } from '@/shared/composables/overlay'
import UiIconButton from './UiIconButton.vue'

/**
 * Modal centrado. Fecha com Esc, clique fora e o botão X; devolve o foco ao gatilho.
 * Rodapé no slot `footer` (ações alinhadas à direita).
 */
const open = defineModel<boolean>('open', { required: true })
const { size = 'md', dismissible = true } = defineProps<{
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  /** false bloqueia Esc e clique fora (ex.: enquanto salva) */
  dismissible?: boolean
}>()
const emit = defineEmits<{ close: [] }>()

const panel = useTemplateRef<HTMLElement>('panel')
const body = useTemplateRef<HTMLElement>('body')
const titleId = useId()
const descriptionId = useId()

function close() {
  if (!dismissible) return
  open.value = false
  emit('close')
}

// foco inicial no primeiro campo do conteúdo; o X do cabeçalho fica por último
useModalLayer(open, panel, close, {
  initialFocus: () => (body.value ? focusableIn(body.value)[0] : undefined),
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-fade">
      <div v-if="open" class="fixed inset-0 z-50 bg-overlay" aria-hidden="true" @click="close" />
    </Transition>
    <Transition name="ui-modal">
      <div v-if="open" class="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
        <section
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="description ? descriptionId : undefined"
          tabindex="-1"
          :class="[
            'pointer-events-auto flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-modal border border-border bg-surface-1 shadow-modal outline-none',
            size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
          ]"
        >
          <header class="flex items-start gap-3 px-5 pt-5 pb-3">
            <div class="min-w-0 flex-1">
              <h2 :id="titleId" class="text-16 font-semibold text-fg">{{ title }}</h2>
              <p v-if="description" :id="descriptionId" class="mt-1 text-14 text-fg-muted">
                {{ description }}
              </p>
            </div>
            <UiIconButton
              v-if="dismissible"
              :icon="X"
              label="Fechar"
              size="sm"
              class="-mt-1 -mr-2"
              @click="close"
            />
          </header>
          <div ref="body" class="min-h-0 flex-1 overflow-y-auto px-5 pb-5 text-14 text-fg">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3"
          >
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

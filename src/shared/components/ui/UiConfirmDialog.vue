<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useModalLayer } from '@/shared/composables/overlay'
import UiButton from './UiButton.vue'

/**
 * Confirmação de ação (role="alertdialog"). Em ações destrutivas o foco começa em
 * Cancelar, para Enter não apagar nada sem querer.
 */
const open = defineModel<boolean>('open', { required: true })
const {
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
} = defineProps<{
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
}>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const panel = useTemplateRef<HTMLElement>('panel')
const cancelButton = useTemplateRef<{ $el: HTMLElement }>('cancelButton')
const confirmButton = useTemplateRef<{ $el: HTMLElement }>('confirmButton')

function cancel() {
  if (loading) return
  open.value = false
  emit('cancel')
}

useModalLayer(open, panel, cancel, {
  initialFocus: () => (danger ? cancelButton.value : confirmButton.value)?.$el,
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-fade">
      <div v-if="open" class="fixed inset-0 z-60 bg-overlay" aria-hidden="true" @click="cancel" />
    </Transition>
    <Transition name="ui-modal">
      <div v-if="open" class="pointer-events-none fixed inset-0 z-60 grid place-items-center p-4">
        <section
          ref="panel"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="ui-confirm-title"
          :aria-describedby="description ? 'ui-confirm-desc' : undefined"
          tabindex="-1"
          class="pointer-events-auto w-full max-w-sm rounded-modal border border-border bg-surface-1 p-5 shadow-modal outline-none"
        >
          <h2 id="ui-confirm-title" class="text-16 font-semibold text-fg">{{ title }}</h2>
          <p v-if="description" id="ui-confirm-desc" class="mt-1.5 text-14 text-fg-muted">
            {{ description }}
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <UiButton ref="cancelButton" :disabled="loading" @click="cancel">{{
              cancelLabel
            }}</UiButton>
            <UiButton
              ref="confirmButton"
              :variant="danger ? 'danger' : 'primary'"
              :loading="loading"
              @click="emit('confirm')"
            >
              {{ confirmLabel }}
            </UiButton>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

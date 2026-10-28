<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { pendingConfirm, type ConfirmOptions } from '@/shared/composables/confirm'
import UiConfirmDialog from './UiConfirmDialog.vue'

/** Monte uma vez (App.vue) para useConfirm() funcionar em qualquer tela. */
// guarda o último texto para o diálogo não esvaziar durante a animação de saída
const shown = shallowRef<ConfirmOptions>({ title: '' })
watch(pendingConfirm, (value) => {
  if (value) shown.value = value
})

const open = computed({
  get: () => pendingConfirm.value !== null,
  set: (value) => {
    if (!value) finish(false)
  },
})

function finish(confirmed: boolean) {
  const current = pendingConfirm.value
  pendingConfirm.value = null
  current?.resolve(confirmed)
}
</script>

<template>
  <UiConfirmDialog
    v-model:open="open"
    :title="shown.title"
    :description="shown.description"
    :confirm-label="shown.confirmLabel"
    :cancel-label="shown.cancelLabel"
    :danger="shown.danger"
    @confirm="finish(true)"
  />
</template>

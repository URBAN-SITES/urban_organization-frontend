<script setup lang="ts">
import { SlidersHorizontal } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiButton, UiCheckbox, UiDialog } from '@/shared/components'
import { setHiddenWidgets } from '../../services'
import { HOME_WIDGETS } from '../../utils/userHome'

/** Escolhe quais painéis aparecem no início; vale para a conta, em qualquer aparelho. */
const hidden = defineModel<string[]>('hidden', { required: true })
const open = ref(false)
const saving = ref(false)

async function toggle(key: string, visible: boolean) {
  const before = hidden.value
  const next = visible ? before.filter((item) => item !== key) : [...before, key]
  hidden.value = next
  saving.value = true
  try {
    hidden.value = await setHiddenWidgets(next)
  } catch (cause) {
    hidden.value = before
    toast.error(getErrorMessage(cause, 'Não foi possível salvar a preferência.'))
  } finally {
    saving.value = false
  }
}

async function showAll() {
  if (!hidden.value.length) return
  const before = hidden.value
  hidden.value = []
  try {
    hidden.value = await setHiddenWidgets([])
  } catch (cause) {
    hidden.value = before
    toast.error(getErrorMessage(cause, 'Não foi possível salvar a preferência.'))
  }
}
</script>

<template>
  <UiButton size="sm" variant="ghost" :icon="SlidersHorizontal" @click="open = true">
    Personalizar
  </UiButton>
  <UiDialog
    v-model:open="open"
    title="Personalizar o início"
    description="Escolha os painéis que aparecem para você. Vale em qualquer aparelho."
  >
    <ul class="grid gap-3">
      <li v-for="widget in HOME_WIDGETS" :key="widget.key">
        <UiCheckbox
          :model-value="!hidden.includes(widget.key)"
          :label="widget.label"
          :description="widget.hint"
          @update:model-value="toggle(widget.key, $event)"
        />
      </li>
    </ul>
    <template #footer>
      <UiButton :disabled="!hidden.length || saving" @click="showAll">Mostrar todos</UiButton>
      <UiButton variant="primary" @click="open = false">Pronto</UiButton>
    </template>
  </UiDialog>
</template>

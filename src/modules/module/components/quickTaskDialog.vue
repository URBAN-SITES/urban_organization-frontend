<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiButton, UiDialog, UiInput, UiSelect } from '@/shared/components'
import { createTask } from '../services'
import { useKanbanStore, useSectorsStore } from '../stores'
import { useQuickActionsStore } from '../stores/quick'
import { isPlainShortcut, modalIsOpen } from '../utils/shortcuts'

/** Nova tarefa de qualquer tela: atalho N ou "Nova tarefa" na paleta de comandos. */
const quick = useQuickActionsStore()
const sectors = useSectorsStore()
const kanban = useKanbanStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ sector: '', title: '', due: '' })
const error = ref('')
const saving = ref(false)

const options = computed(() =>
  sectors.sectors
    .filter((sector) => !sector.archived_at)
    .map((sector) => ({ value: sector.id, label: sector.name })),
)

watch(
  () => quick.taskOpen,
  (open) => {
    if (!open) return
    // o projeto aberto vem primeiro; senão o último usado ou o primeiro da lista
    const here = route.name === 'SectorBoard' ? String(route.params.sectorId ?? '') : ''
    const known = (id: string) => options.value.some((option) => option.value === id)
    form.sector =
      [here, form.sector, options.value[0]?.value ?? ''].find((id) => id && known(id)) ?? ''
    form.title = ''
    form.due = ''
    error.value = ''
  },
)

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (event.key.toLowerCase() !== 'n' || !isPlainShortcut(event, modalIsOpen())) return
  if (!options.value.length) return
  event.preventDefault()
  quick.taskOpen = true
})

async function save() {
  const title = form.title.trim()
  error.value = title ? '' : 'Dê um título para a tarefa.'
  if (error.value || !form.sector || saving.value) return
  saving.value = true
  const payload = { title: title.slice(0, 255), due_date: form.due || null }
  try {
    const sectorId = form.sector
    const task =
      kanban.sectorId === sectorId
        ? await kanban.addTask(payload)
        : await createTask(sectorId, payload)
    quick.taskOpen = false
    toast.success(task.key ? `${task.key} criada.` : 'Tarefa criada.', {
      action: {
        label: 'Abrir',
        onClick: () => void router.push(`/setores/${sectorId}?task=${task.id}`),
      },
    })
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível criar a tarefa.'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiDialog
    v-model:open="quick.taskOpen"
    title="Nova tarefa"
    description="Crie agora e complete os detalhes depois."
    :dismissible="!saving"
  >
    <form id="quick-task" class="grid gap-4" novalidate @submit.prevent="save">
      <UiInput
        v-model="form.title"
        label="Título"
        maxlength="255"
        required
        size="lg"
        :error="error"
        @update:model-value="error && form.title.trim() && (error = '')"
      />
      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect v-model="form.sector" label="Projeto" :options="options" required />
        <UiInput v-model="form.due" type="date" label="Prazo" />
      </div>
    </form>
    <template #footer>
      <UiButton :disabled="saving" @click="quick.taskOpen = false">Cancelar</UiButton>
      <UiButton type="submit" form="quick-task" variant="primary" :loading="saving">
        Criar tarefa
      </UiButton>
    </template>
  </UiDialog>
</template>

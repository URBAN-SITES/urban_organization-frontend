<script setup lang="ts">
import { FileUp } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiButton, UiDialog } from '@/shared/components'
import { importTasks } from '../services'
import type { ImportResult, ImportSource } from '../types'

/**
 * Importa tarefas de um arquivo exportado de outra ferramenta. Tudo sai do arquivo:
 * nenhuma conta é conectada. Primeiro mostra a prévia, depois cria as tarefas.
 */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ sectorId: string }>()
const emit = defineEmits<{ imported: [] }>()

const SOURCES: { value: ImportSource; label: string; hint: string; accept: string }[] = [
  {
    value: 'trello',
    label: 'Trello',
    hint: 'Menu do quadro › Imprimir, exportar e compartilhar › Exportar como JSON',
    accept: '.json,application/json',
  },
  {
    value: 'jira',
    label: 'Jira',
    hint: 'Filtro de itens › Exportar › CSV (todos os campos)',
    accept: '.csv,text/csv',
  },
  {
    value: 'asana',
    label: 'Asana',
    hint: 'Menu do projeto › Exportar/imprimir › CSV',
    accept: '.csv,text/csv',
  },
  {
    value: 'plane',
    label: 'Plane',
    hint: 'Configurações do workspace › Exportações › CSV',
    accept: '.csv,text/csv',
  },
  {
    value: 'csv',
    label: 'Planilha CSV',
    hint: 'Colunas reconhecidas: título, descrição, status, prioridade, prazo, etiquetas',
    accept: '.csv,text/csv',
  },
]

const source = ref<ImportSource>('trello')
const file = ref<File | null>(null)
const preview = ref<ImportResult | null>(null)
const busy = ref(false)
const input = ref<HTMLInputElement | null>(null)
const current = computed(() => SOURCES.find((item) => item.value === source.value)!)

watch(open, (value) => {
  if (!value) return
  file.value = null
  preview.value = null
})
watch(source, () => {
  file.value = null
  preview.value = null
  if (input.value) input.value.value = ''
})

async function pick(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
  preview.value = null
  if (!file.value) return
  busy.value = true
  try {
    preview.value = await importTasks(props.sectorId, source.value, file.value, true)
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível ler o arquivo.'))
    file.value = null
    if (input.value) input.value.value = ''
  } finally {
    busy.value = false
  }
}

async function confirmImport() {
  if (!file.value || !preview.value || busy.value) return
  busy.value = true
  try {
    const result = await importTasks(props.sectorId, source.value, file.value, false)
    toast.success(
      result.created === 1 ? '1 tarefa importada.' : `${result.created} tarefas importadas.`,
    )
    open.value = false
    emit('imported')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível importar as tarefas.'))
  } finally {
    busy.value = false
  }
}

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="Importar tarefas"
    description="Traga as tarefas de outra ferramenta usando o arquivo exportado dela. Nenhuma conta é conectada."
    :dismissible="!busy"
  >
    <div class="grid gap-4">
      <fieldset class="grid gap-2">
        <legend class="mb-2 text-13 font-medium text-fg">De onde vêm as tarefas</legend>
        <div class="flex flex-wrap gap-2">
          <label v-for="item in SOURCES" :key="item.value" class="im-source">
            <input v-model="source" type="radio" name="import-source" :value="item.value" />
            {{ item.label }}
          </label>
        </div>
        <p class="text-12 text-fg-muted">{{ current.hint }}</p>
      </fieldset>

      <label class="im-drop">
        <FileUp :size="18" class="text-fg-muted" aria-hidden="true" />
        <span class="min-w-0 truncate text-13 text-fg">
          {{ file ? file.name : 'Escolher arquivo (até 5 MB)' }}
        </span>
        <input
          ref="input"
          type="file"
          class="sr-only"
          :accept="current.accept"
          :disabled="busy"
          @change="pick"
        />
      </label>

      <div
        v-if="preview"
        class="grid gap-2 rounded-lg border border-border p-3 text-13"
        role="status"
      >
        <p class="font-medium text-fg">
          {{ plural(preview.total, 'tarefa será criada', 'tarefas serão criadas') }}
        </p>
        <ul class="grid gap-1 text-fg-muted">
          <li v-if="preview.new_columns.length">
            Colunas novas: {{ preview.new_columns.join(', ') }}
          </li>
          <li v-if="preview.new_labels.length">
            Etiquetas novas: {{ preview.new_labels.join(', ') }}
          </li>
          <li v-if="preview.assigned">
            {{ plural(preview.assigned, 'tarefa já vem', 'tarefas já vêm') }} com responsável (pelo
            e-mail de quem participa do projeto)
          </li>
          <li>Primeiras: {{ preview.sample.join(' · ') }}</li>
        </ul>
      </div>
    </div>
    <template #footer>
      <UiButton :disabled="busy" @click="open = false">Cancelar</UiButton>
      <UiButton variant="primary" :loading="busy" :disabled="!preview" @click="confirmImport">
        {{ preview ? `Importar ${preview.total}` : 'Importar' }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<style>
.im-source {
  position: relative;
  display: inline-flex;
  height: 34px;
  cursor: pointer;
  align-items: center;
  border: 1px solid var(--ds-border);
  border-radius: 999px;
  padding-inline: 14px;
  font-size: var(--text-13);
  color: var(--ds-fg-muted);
}

.im-source input {
  position: absolute;
  inset: 0;
  cursor: pointer;
  opacity: 0;
}

.im-source:has(input:checked) {
  border-color: var(--ds-accent);
  color: var(--ds-fg);
}

.im-source:has(input:focus-visible) {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}

.im-drop {
  display: flex;
  min-height: 56px;
  cursor: pointer;
  align-items: center;
  gap: 10px;
  border: 1px dashed var(--ds-border-strong);
  border-radius: 10px;
  padding: 12px 14px;
}

.im-drop:hover {
  background: var(--ds-surface-2);
}

.im-drop:has(input:focus-visible) {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}
</style>

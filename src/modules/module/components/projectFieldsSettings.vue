<script setup lang="ts">
import { LayoutTemplate, Plus, SlidersHorizontal, Trash2, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import {
  UiButton,
  UiEmptyState,
  UiIconButton,
  UiInput,
  UiSelect,
  UiSpinner,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import {
  createCustomField,
  deleteCustomField,
  deleteTemplate,
  listCustomFields,
  listTemplates,
  updateCustomField,
} from '../services'
import type { CustomField, CustomFieldType, TaskTemplate } from '../types'

/** Configurações do projeto: campos personalizados das tarefas e modelos salvos. */
const props = defineProps<{ sectorId: string; canManage: boolean }>()
const confirm = useConfirm()

const fields = ref<CustomField[]>([])
const templates = ref<TaskTemplate[]>([])
const loading = ref(true)
const adding = ref(false)
const busy = ref(false)
const draft = ref({ name: '', type: 'text' as CustomFieldType, options: '' })
const optionDrafts = ref<Record<string, string>>({})

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  select: 'Lista de opções',
  checkbox: 'Sim ou não',
  url: 'Link',
}
const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))

watch(
  () => props.sectorId,
  async (id) => {
    loading.value = true
    try {
      const [fieldRows, templateRows] = await Promise.all([listCustomFields(id), listTemplates(id)])
      if (id !== props.sectorId) return
      fields.value = fieldRows
      templates.value = templateRows
    } catch (cause) {
      toast.error(getErrorMessage(cause, 'Não foi possível carregar os campos do projeto.'))
    } finally {
      if (id === props.sectorId) loading.value = false
    }
  },
  { immediate: true },
)

const splitOptions = (text: string) =>
  [
    ...new Set(
      text
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].map((name) => ({ name: name.slice(0, 100) }))
const draftOptions = computed(() => splitOptions(draft.value.options))

async function addField() {
  const name = draft.value.name.trim()
  if (!name || busy.value) return
  if (draft.value.type === 'select' && !draftOptions.value.length) {
    toast.error('Escreva as opções separadas por vírgula.')
    return
  }
  busy.value = true
  try {
    const created = await createCustomField(props.sectorId, {
      name: name.slice(0, 100),
      type: draft.value.type,
      ...(draft.value.type === 'select' && { options: draftOptions.value }),
    })
    fields.value = [...fields.value, created]
    draft.value = { name: '', type: 'text', options: '' }
    adding.value = false
    toast.success(`Campo “${created.name}” criado. Ele aparece no painel de cada tarefa.`)
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível criar o campo.'))
  } finally {
    busy.value = false
  }
}

async function addOption(field: CustomField) {
  const extra = splitOptions(optionDrafts.value[field.id] ?? '')
  if (!extra.length) return
  try {
    const updated = await updateCustomField(field.id, {
      options: [...field.options, ...extra],
    })
    fields.value = fields.value.map((row) => (row.id === field.id ? updated : row))
    optionDrafts.value[field.id] = ''
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível adicionar a opção.'))
  }
}

async function removeOption(field: CustomField, index: number) {
  try {
    const updated = await updateCustomField(field.id, {
      options: field.options.filter((_, i) => i !== index),
    })
    fields.value = fields.value.map((row) => (row.id === field.id ? updated : row))
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível remover a opção.'))
  }
}

async function removeField(field: CustomField) {
  const ok = await confirm({
    title: `Apagar o campo “${field.name}”?`,
    description: 'Os valores preenchidos nas tarefas também somem.',
    confirmLabel: 'Apagar campo',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteCustomField(field.id)
    fields.value = fields.value.filter((row) => row.id !== field.id)
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível apagar o campo.'))
  }
}

async function removeTemplate(template: TaskTemplate) {
  try {
    await deleteTemplate(template.id)
    templates.value = templates.value.filter((row) => row.id !== template.id)
    toast.success(`Modelo “${template.name}” apagado.`)
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível apagar o modelo.'))
  }
}
</script>

<template>
  <div class="grid items-start gap-4 xl:grid-cols-2">
    <section class="grid gap-3 uo-card p-[18px]" aria-labelledby="fields-title">
      <div class="flex items-center justify-between gap-2">
        <h2 id="fields-title" class="flex items-center gap-2 text-16 font-semibold text-fg">
          <SlidersHorizontal :size="17" class="text-fg-muted" aria-hidden="true" />
          Campos personalizados
        </h2>
        <UiButton
          v-if="canManage && !adding"
          size="sm"
          variant="ghost"
          :icon="Plus"
          @click="adding = true"
        >
          Novo campo
        </UiButton>
      </div>
      <p class="text-13 text-fg-muted">
        Informações próprias do projeto em cada tarefa, como cliente, custo ou link do protótipo.
      </p>

      <p v-if="loading" class="flex items-center gap-2 text-13 text-fg-muted">
        <UiSpinner :size="14" /> Carregando…
      </p>

      <form
        v-if="adding"
        class="grid gap-3 rounded-card border border-border bg-bg-2 p-3"
        @submit.prevent="addField"
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <UiInput v-model="draft.name" label="Nome" maxlength="100" placeholder="Ex.: Cliente" />
          <UiSelect v-model="draft.type" label="Tipo" :options="TYPE_OPTIONS" />
        </div>
        <UiInput
          v-if="draft.type === 'select'"
          v-model="draft.options"
          label="Opções"
          placeholder="Separadas por vírgula: Acme, Beta, Interno"
        />
        <div class="flex justify-end gap-2">
          <UiButton size="sm" @click="adding = false">Cancelar</UiButton>
          <UiButton
            type="submit"
            size="sm"
            variant="primary"
            :loading="busy"
            :disabled="!draft.name.trim()"
          >
            Criar campo
          </UiButton>
        </div>
      </form>

      <ul v-if="fields.length" class="grid gap-2">
        <li
          v-for="field in fields"
          :key="field.id"
          class="grid gap-2 rounded-card border border-border p-3"
        >
          <div class="flex items-center gap-2">
            <span class="min-w-0 flex-1 truncate text-14 font-medium text-fg">{{
              field.name
            }}</span>
            <span class="text-12 text-fg-muted">{{ TYPE_LABELS[field.type] }}</span>
            <UiIconButton
              v-if="canManage"
              :icon="Trash2"
              size="sm"
              :label="`Apagar o campo ${field.name}`"
              @click="removeField(field)"
            />
          </div>
          <div v-if="field.type === 'select'" class="flex flex-wrap items-center gap-1.5">
            <span
              v-for="(option, index) in field.options"
              :key="option.id ?? option.name"
              class="inline-flex h-6 items-center gap-1 rounded-full bg-surface-2 pr-1 pl-2.5 text-12 text-fg"
            >
              {{ option.name }}
              <button
                v-if="canManage && field.options.length > 1"
                type="button"
                class="grid size-4 cursor-pointer place-items-center rounded-full text-fg-muted hover:text-fg"
                :aria-label="`Remover a opção ${option.name}`"
                @click="removeOption(field, index)"
              >
                <X :size="11" aria-hidden="true" />
              </button>
            </span>
            <form
              v-if="canManage"
              class="flex items-center gap-1"
              @submit.prevent="addOption(field)"
            >
              <UiInput
                v-model="optionDrafts[field.id]!"
                placeholder="Nova opção"
                :aria-label="`Nova opção de ${field.name}`"
                class="w-32"
              />
            </form>
          </div>
        </li>
      </ul>
      <p v-else-if="!loading && !adding" class="text-13 text-fg-muted">Nenhum campo ainda.</p>
    </section>

    <section class="grid gap-3 uo-card p-[18px]" aria-labelledby="templates-title">
      <h2 id="templates-title" class="flex items-center gap-2 text-16 font-semibold text-fg">
        <LayoutTemplate :size="17" class="text-fg-muted" aria-hidden="true" />
        Modelos de tarefa
      </h2>
      <UiEmptyState
        v-if="!loading && !templates.length"
        :icon="LayoutTemplate"
        title="Nenhum modelo"
        description="Abra uma tarefa e use “Salvar como modelo”. Depois, escolha o modelo ao criar uma tarefa."
      />
      <ul v-else class="grid gap-2">
        <li
          v-for="template in templates"
          :key="template.id"
          class="flex items-center gap-2 rounded-card border border-border p-3"
        >
          <span class="min-w-0 flex-1">
            <span class="block truncate text-14 font-medium text-fg">{{ template.name }}</span>
            <span class="text-12 text-fg-muted">
              {{ template.checklist.length }}
              {{ template.checklist.length === 1 ? 'item de checklist' : 'itens de checklist' }}
              <template v-if="template.label_ids.length">
                · {{ template.label_ids.length }}
                {{ template.label_ids.length === 1 ? 'etiqueta' : 'etiquetas' }}
              </template>
            </span>
          </span>
          <UiIconButton
            v-if="canManage"
            :icon="Trash2"
            size="sm"
            :label="`Apagar o modelo ${template.name}`"
            @click="removeTemplate(template)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>

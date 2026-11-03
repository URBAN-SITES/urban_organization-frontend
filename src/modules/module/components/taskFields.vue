<script setup lang="ts">
import { SlidersHorizontal } from '@lucide/vue'
import { reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiCheckbox, UiInput, UiSelect } from '@/shared/components'
import { listTaskFieldValues, setTaskFieldValue } from '../services'
import type { CustomField, FieldValue } from '../types'

/** Campos personalizados do projeto, preenchidos nesta tarefa; cada um salva ao mudar. */
const props = defineProps<{ taskId: string; fields: CustomField[]; canEdit: boolean }>()

const values = reactive<Record<string, FieldValue>>({})
const drafts = reactive<Record<string, string>>({})
const loading = ref(true)

watch(
  () => props.taskId,
  async (id) => {
    loading.value = true
    for (const key of Object.keys(values)) delete values[key]
    try {
      const rows = await listTaskFieldValues(id)
      if (id !== props.taskId) return
      for (const row of rows) values[row.field_id] = row.value
    } catch {
      // sem valores: os campos aparecem vazios
    } finally {
      if (id === props.taskId) loading.value = false
    }
    for (const field of props.fields) drafts[field.id] = text(values[field.id])
  },
  { immediate: true },
)

const text = (value: FieldValue | undefined) =>
  value === null || value === undefined || typeof value === 'boolean' ? '' : String(value)

async function save(field: CustomField, raw: FieldValue) {
  const value = raw === '' ? null : raw
  if (value === (values[field.id] ?? null)) return
  const id = props.taskId
  try {
    const row = await setTaskFieldValue(id, field.id, value)
    if (id === props.taskId) values[field.id] = row.value
  } catch (cause) {
    toast.error(getErrorMessage(cause, `Não foi possível salvar “${field.name}”.`))
    drafts[field.id] = text(values[field.id])
  }
}

const optionsOf = (field: CustomField) => [
  { value: '', label: 'Vazio' },
  ...field.options.map((option) => ({ value: option.id ?? '', label: option.name })),
]
const INPUT_TYPE = { text: 'text', number: 'number', date: 'date', url: 'url' } as const
</script>

<template>
  <section v-if="fields.length" class="grid gap-3" aria-labelledby="task-fields-title">
    <h3 id="task-fields-title" class="flex items-center gap-2 text-13 font-medium text-fg">
      <SlidersHorizontal :size="15" class="text-fg-muted" aria-hidden="true" />
      Campos do projeto
    </h3>
    <div v-if="!loading" class="grid gap-4 sm:grid-cols-2">
      <template v-for="field in fields" :key="field.id">
        <UiSelect
          v-if="field.type === 'select'"
          v-model="drafts[field.id]!"
          :label="field.name"
          :options="optionsOf(field)"
          :disabled="!canEdit"
          @update:model-value="save(field, $event)"
        />
        <div v-else-if="field.type === 'checkbox'" class="flex items-end pb-2">
          <UiCheckbox
            :model-value="values[field.id] === true"
            :label="field.name"
            :disabled="!canEdit"
            @update:model-value="save(field, $event ? true : null)"
          />
        </div>
        <UiInput
          v-else
          v-model="drafts[field.id]!"
          :type="INPUT_TYPE[field.type as keyof typeof INPUT_TYPE]"
          :label="field.name"
          :disabled="!canEdit"
          :placeholder="field.type === 'url' ? 'https://' : undefined"
          @change="save(field, drafts[field.id]!.trim())"
        />
      </template>
    </div>
  </section>
</template>

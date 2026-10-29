<script setup lang="ts">
import { Plus, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiButton, UiCheckbox, UiIconButton, UiInput, UiProgress } from '@/shared/components'
import { fetchAllPages } from '@/shared/utils'
import {
  createChecklistItem,
  deleteChecklistItem,
  listChecklist,
  updateChecklistItem,
} from '../services'
import type { ChecklistItem } from '../types'

/** Checklist da tarefa; cada mudança vale na hora. */
const props = defineProps<{ taskId: string; canEdit: boolean }>()
const emit = defineEmits<{ changed: [] }>()

const items = ref<ChecklistItem[]>([])
const content = ref('')
const busy = ref(false)
const done = computed(() => items.value.filter((item) => item.is_done).length)

watch(
  () => props.taskId,
  async (id) => {
    items.value = []
    try {
      const rows = await fetchAllPages((page) => listChecklist(id, page))
      if (props.taskId === id) items.value = rows
    } catch (cause) {
      toast.error(getErrorMessage(cause, 'Não foi possível carregar o checklist.'))
    }
  },
  { immediate: true },
)

async function run(action: () => Promise<void>, failure: string) {
  if (busy.value) return
  busy.value = true
  try {
    await action()
    emit('changed')
  } catch (cause) {
    toast.error(getErrorMessage(cause, failure))
  } finally {
    busy.value = false
  }
}

const add = () =>
  run(async () => {
    const value = content.value.trim()
    if (!value) return
    items.value = [...items.value, await createChecklistItem(props.taskId, { content: value })]
    content.value = ''
  }, 'Não foi possível adicionar o item.')

const toggle = (item: ChecklistItem, value: boolean) =>
  run(async () => {
    const updated = await updateChecklistItem(props.taskId, item.id, { is_done: value })
    items.value = items.value.map((row) => (row.id === item.id ? updated : row))
  }, 'Não foi possível atualizar o item.')

const remove = (item: ChecklistItem) =>
  run(async () => {
    await deleteChecklistItem(props.taskId, item.id)
    items.value = items.value.filter((row) => row.id !== item.id)
  }, 'Não foi possível remover o item.')
</script>

<template>
  <section aria-labelledby="task-checklist" class="grid gap-2">
    <h3 id="task-checklist" class="text-13 font-semibold text-fg">
      Checklist
      <span v-if="items.length" class="font-normal text-fg-muted">
        {{ done }}/{{ items.length }}
      </span>
    </h3>
    <UiProgress
      v-if="items.length"
      :value="done"
      :max="items.length"
      tone="neutral"
      label="Progresso do checklist"
    />
    <ul v-if="items.length" class="grid gap-1">
      <li v-for="item in items" :key="item.id" class="group flex items-center gap-2">
        <UiCheckbox
          :model-value="item.is_done"
          :disabled="!canEdit || busy"
          :aria-label="item.content"
          @update:model-value="toggle(item, $event)"
        />
        <span
          :class="[
            'min-w-0 flex-1 text-14',
            item.is_done ? 'text-fg-muted line-through' : 'text-fg',
          ]"
        >
          {{ item.content }}
        </span>
        <UiIconButton
          v-if="canEdit"
          :icon="X"
          size="sm"
          :label="`Remover ${item.content}`"
          :disabled="busy"
          class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
          @click="remove(item)"
        />
      </li>
    </ul>
    <form v-if="canEdit" class="flex gap-2" @submit.prevent="add">
      <UiInput
        v-model="content"
        placeholder="Novo item"
        aria-label="Novo item do checklist"
        maxlength="255"
        class="flex-1"
      />
      <UiButton type="submit" :icon="Plus" :disabled="!content.trim() || busy">Adicionar</UiButton>
    </form>
  </section>
</template>

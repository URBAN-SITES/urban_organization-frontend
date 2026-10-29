<script setup lang="ts">
import { Check, Plus, Tag } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiButton, UiInput, UiPopover } from '@/shared/components'
import { createLabel } from '../services'
import type { Label } from '../types'
import { PROJECT_COLORS } from '../utils/projectAppearance'

/** Escolhe as etiquetas da tarefa e cria novas no projeto. */
const selected = defineModel<string[]>({ required: true })
const props = defineProps<{ sectorId: string; labels: Label[]; disabled?: boolean }>()
const emit = defineEmits<{ created: [label: Label] }>()

const name = ref('')
const creating = ref(false)
const search = computed(() => name.value.trim().toLocaleLowerCase())
const shown = computed(() =>
  props.labels.filter((label) => label.name.toLocaleLowerCase().includes(search.value)),
)
const exists = computed(() =>
  props.labels.some((label) => label.name.toLocaleLowerCase() === search.value),
)

function toggle(id: string) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((value) => value !== id)
    : [...selected.value, id]
}

async function create() {
  const value = name.value.trim()
  if (!value || exists.value || creating.value) return
  creating.value = true
  try {
    const color = PROJECT_COLORS[props.labels.length % PROJECT_COLORS.length]!.value
    const label = await createLabel(props.sectorId, { name: value.slice(0, 50), color })
    emit('created', label)
    selected.value = [...selected.value, label.id]
    name.value = ''
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível criar a etiqueta.'))
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <UiPopover label="Etiquetas" placement="bottom-start">
    <template #trigger="{ props: trigger }">
      <UiButton v-bind="trigger" size="sm" variant="ghost" :icon="Tag" :disabled="disabled">
        {{ selected.length ? 'Editar etiquetas' : 'Adicionar etiqueta' }}
      </UiButton>
    </template>
    <form class="grid w-64 gap-2" @submit.prevent="create">
      <UiInput
        v-model="name"
        placeholder="Buscar ou criar etiqueta"
        aria-label="Buscar ou criar etiqueta"
        maxlength="50"
      />
      <ul class="grid max-h-56 gap-0.5 overflow-y-auto" aria-label="Etiquetas do projeto">
        <li v-for="label in shown" :key="label.id">
          <button
            type="button"
            :aria-pressed="selected.includes(label.id)"
            class="flex h-8 w-full cursor-pointer items-center gap-2 rounded-control px-2 text-left text-13 text-fg hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
            @click="toggle(label.id)"
          >
            <span
              class="size-2 shrink-0 rounded-full bg-fg-muted"
              :style="label.color ? { backgroundColor: label.color } : undefined"
              aria-hidden="true"
            />
            <span class="flex-1 truncate">{{ label.name }}</span>
            <Check v-if="selected.includes(label.id)" :size="14" aria-hidden="true" />
          </button>
        </li>
        <li v-if="!shown.length && !search" class="px-2 py-2 text-12 text-fg-muted">
          Este projeto ainda não tem etiquetas.
        </li>
      </ul>
      <UiButton
        v-if="search && !exists"
        type="submit"
        size="sm"
        :icon="Plus"
        :loading="creating"
        class="justify-start"
      >
        Criar “{{ name.trim() }}”
      </UiButton>
    </form>
  </UiPopover>
</template>

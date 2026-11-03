<script setup lang="ts">
import { Bookmark, Lock, Users, X } from '@lucide/vue'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { useAuthStore } from '@/modules/auth'
import { UiButton, UiCheckbox, UiIconButton, UiInput, UiPopover } from '@/shared/components'
import { createSavedView, deleteSavedView, listSavedViews } from '../services'
import type { SavedView, SaveViewRequest } from '../types'

/** Visões salvas do projeto: guardar filtros, busca e modo com um nome e voltar a eles. */
const props = defineProps<{
  sectorId: string
  canEdit: boolean
  canManage: boolean
  current: Omit<SaveViewRequest, 'name' | 'is_shared'>
  activeId: string
}>()
const emit = defineEmits<{ apply: [view: SavedView] }>()
const auth = useAuthStore()

const views = ref<SavedView[]>([])
const open = ref(false)
const name = ref('')
const shared = ref(true)
const saving = ref(false)

watch(
  () => props.sectorId,
  async (id) => {
    views.value = []
    const rows = await listSavedViews(id).catch(() => [])
    if (id === props.sectorId) views.value = rows
  },
  { immediate: true },
)

const LAYOUT_TEXT = { board: 'Quadro', list: 'Lista', table: 'Tabela', timeline: 'Linha do tempo' }
const mine = (view: SavedView) => view.owner_id === auth.user?.id
const canDelete = (view: SavedView) => mine(view) || props.canManage

async function save() {
  const value = name.value.trim()
  if (!value || saving.value) return
  saving.value = true
  try {
    const created = await createSavedView(props.sectorId, {
      ...props.current,
      name: value.slice(0, 100),
      is_shared: props.canEdit && shared.value,
    })
    views.value = [...views.value, created]
    name.value = ''
    open.value = false
    emit('apply', created)
    toast.success(`Visão “${created.name}” salva.`)
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível salvar a visão.'))
  } finally {
    saving.value = false
  }
}

async function remove(view: SavedView) {
  try {
    await deleteSavedView(view.id)
    views.value = views.value.filter((row) => row.id !== view.id)
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível apagar a visão.'))
  }
}

function pick(view: SavedView, close: () => void) {
  emit('apply', view)
  close()
}
</script>

<template>
  <UiPopover v-model:open="open" label="Visões salvas" placement="bottom-end">
    <template #trigger="{ props: trigger }">
      <button
        type="button"
        v-bind="{ ...trigger, 'aria-haspopup': 'dialog' as const }"
        class="board-glass"
        :aria-label="`Visões salvas${views.length ? ` (${views.length})` : ''}`"
      >
        <Bookmark :size="15" :class="activeId ? 'fill-current' : ''" aria-hidden="true" />
        <span class="hidden sm:inline">{{
          views.find((v) => v.id === activeId)?.name ?? 'Visões'
        }}</span>
      </button>
    </template>
    <template #default="{ close }">
      <div class="grid w-72 gap-3">
        <p class="text-13 font-medium text-fg">Visões salvas</p>
        <ul v-if="views.length" class="grid gap-1">
          <li
            v-for="view in views"
            :key="view.id"
            class="view-row"
            :data-active="view.id === activeId"
          >
            <button type="button" class="view-pick" @click="pick(view, close)">
              <component
                :is="view.is_shared ? Users : Lock"
                :size="13"
                class="shrink-0 text-fg-muted"
                :aria-label="view.is_shared ? 'Compartilhada' : 'Só sua'"
                role="img"
              />
              <span class="min-w-0 flex-1 truncate">{{ view.name }}</span>
              <span class="shrink-0 text-12 text-fg-muted">{{ LAYOUT_TEXT[view.layout] }}</span>
            </button>
            <UiIconButton
              v-if="canDelete(view)"
              :icon="X"
              size="sm"
              :label="`Apagar a visão ${view.name}`"
              @click="remove(view)"
            />
          </li>
        </ul>
        <p v-else class="text-12 text-fg-muted">
          Nenhuma ainda. Ajuste filtros, busca e modo e salve para voltar com um clique.
        </p>
        <form class="grid gap-2 border-t border-border pt-3" @submit.prevent="save">
          <UiInput
            v-model="name"
            placeholder="Nome da visão atual"
            aria-label="Nome da visão"
            maxlength="100"
          />
          <UiCheckbox v-if="canEdit" v-model="shared" label="Compartilhar com o projeto" />
          <UiButton
            type="submit"
            variant="primary"
            size="sm"
            :loading="saving"
            :disabled="!name.trim()"
          >
            Salvar visão atual
          </UiButton>
        </form>
      </div>
    </template>
  </UiPopover>
</template>

<style>
.view-row {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
}

.view-row[data-active='true'] {
  background: var(--ds-surface-2);
}

.view-pick {
  display: flex;
  min-width: 0;
  min-height: 34px;
  flex: 1;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding-inline: 8px;
  font-size: var(--text-13);
  color: var(--ds-fg);
  text-align: left;
}

.view-pick:hover {
  background: var(--ds-surface-2);
}

.view-pick:focus-visible {
  outline: 2px solid var(--ds-accent);
  outline-offset: -2px;
}
</style>

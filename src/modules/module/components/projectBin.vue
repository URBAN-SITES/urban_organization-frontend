<script setup lang="ts">
import { Archive, ArchiveRestore, RotateCcw, Trash2 } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiButton, UiDrawer, UiEmptyState, UiSpinner, UiTabs } from '@/shared/components'
import { fetchAllPages } from '@/shared/utils'
import { listTasks, listTrash } from '../services'
import { useKanbanStore } from '../stores'
import type { Sector, Task, TrashedTask } from '../types'

/** Tarefas arquivadas e lixeira do projeto (excluídas nos últimos 30 dias). */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ sector: Sector }>()
const kanban = useKanbanStore()

const tab = ref('archived')
const archived = ref<Task[]>([])
const trash = ref<TrashedTask[]>([])
const loading = ref(false)
const busy = ref('')

const tabs = computed(() => [
  { value: 'archived', label: 'Arquivadas', count: archived.value.length },
  { value: 'trash', label: 'Lixeira', count: trash.value.length },
])

async function load() {
  loading.value = true
  const id = props.sector.id
  try {
    const [rows, deleted] = await Promise.all([
      fetchAllPages((page) => listTasks(id, { page, archived: true, ordering: '-completed_at' })),
      fetchAllPages((page) => listTrash(id, page)),
    ])
    if (id !== props.sector.id) return
    archived.value = rows.filter((task) => !task.parent_id)
    trash.value = deleted
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível carregar.'))
  } finally {
    loading.value = false
  }
}
watch(open, (isOpen) => {
  if (!isOpen) return
  void load()
})

async function unarchive(task: Task) {
  busy.value = task.id
  try {
    await kanban.archive(task.id, false)
    archived.value = archived.value.filter((row) => row.id !== task.id)
    toast.success('Tarefa de volta ao quadro.')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível desarquivar.'))
  } finally {
    busy.value = ''
  }
}

async function restore(task: TrashedTask) {
  busy.value = task.id
  try {
    await kanban.restore(task.id)
    trash.value = trash.value.filter((row) => row.id !== task.id)
    toast.success('Tarefa restaurada.')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível restaurar.'))
  } finally {
    busy.value = ''
  }
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''
</script>

<template>
  <UiDrawer v-model:open="open" title="Arquivadas e lixeira" :description="sector.name">
    <UiTabs v-model="tab" :tabs="tabs" label="Arquivadas e lixeira">
      <div class="grid gap-3 pt-4">
        <p v-if="loading" class="flex items-center gap-2 text-13 text-fg-muted">
          <UiSpinner :size="14" /> Carregando…
        </p>

        <template v-else-if="tab === 'archived'">
          <UiEmptyState
            v-if="!archived.length"
            :icon="Archive"
            title="Nenhuma tarefa arquivada"
            description="Arquive pelo painel da tarefa, ou ligue o arquivamento automático nas configurações do projeto."
          />
          <ul v-else class="grid gap-1.5">
            <li v-for="task in archived" :key="task.id" class="bin-row">
              <div class="min-w-0 flex-1">
                <p class="truncate text-13 text-fg">
                  <span v-if="task.key" class="mr-1.5 font-mono text-12 text-fg-muted">{{
                    task.key
                  }}</span
                  >{{ task.title }}
                </p>
                <p class="text-12 text-fg-muted">Arquivada em {{ when(task.archived_at) }}</p>
              </div>
              <UiButton
                size="sm"
                :icon="ArchiveRestore"
                :loading="busy === task.id"
                @click="unarchive(task)"
              >
                Desarquivar
              </UiButton>
            </li>
          </ul>
        </template>

        <template v-else>
          <UiEmptyState
            v-if="!trash.length"
            :icon="Trash2"
            title="A lixeira está vazia"
            description="Tarefas excluídas ficam aqui por 30 dias."
          />
          <ul v-else class="grid gap-1.5">
            <li v-for="task in trash" :key="task.id" class="bin-row">
              <div class="min-w-0 flex-1">
                <p class="truncate text-13 text-fg">{{ task.title }}</p>
                <p class="text-12 text-fg-muted">
                  Excluída em {{ when(task.deleted_at) }}
                  <template v-if="task.subtask_count">
                    · {{ task.subtask_count }}
                    {{ task.subtask_count === 1 ? 'subtarefa' : 'subtarefas' }}
                  </template>
                </p>
              </div>
              <UiButton
                size="sm"
                :icon="RotateCcw"
                :loading="busy === task.id"
                @click="restore(task)"
              >
                Restaurar
              </UiButton>
            </li>
          </ul>
        </template>
      </div>
    </UiTabs>
  </UiDrawer>
</template>

<style>
.bin-row {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--ds-border);
  border-radius: 10px;
  background: var(--ds-bg-2);
  padding: 8px 8px 8px 12px;
}
</style>

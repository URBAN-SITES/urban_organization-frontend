<script setup lang="ts">
import { Ban, Check, Link2, Plus, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiButton, UiIconButton, UiSelect, UiSpinner } from '@/shared/components'
import { addTaskRelation, getTaskRelations, removeTaskRelation } from '../services'
import { useKanbanStore } from '../stores'
import type { RelatedTask, RelationKind, TaskRelations } from '../types'

/** Bloqueios entre tarefas do projeto: "bloqueada por" e "bloqueando". */
const props = defineProps<{ taskId: string; canEdit: boolean }>()
const emit = defineEmits<{ open: [id: string] }>()
const kanban = useKanbanStore()

const relations = ref<TaskRelations>({ blocked_by: [], blocking: [] })
const loading = ref(true)
const adding = ref(false)
const kind = ref<RelationKind>('blocked_by')
const other = ref('')
const busy = ref(false)

const SECTIONS: { kind: RelationKind; title: string }[] = [
  { kind: 'blocked_by', title: 'Bloqueada por' },
  { kind: 'blocking', title: 'Bloqueando' },
]
const KIND_OPTIONS = [
  { value: 'blocked_by', label: 'Bloqueada por' },
  { value: 'blocking', label: 'Bloqueando' },
]
const related = computed(
  () => new Set([...relations.value.blocked_by, ...relations.value.blocking].map((t) => t.id)),
)
const candidates = computed(() => [
  { value: '', label: 'Escolha a tarefa' },
  ...kanban.tasks
    .filter((task) => task.id !== props.taskId && !related.value.has(task.id))
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((task) => ({ value: task.id, label: task.title })),
])
const total = computed(() => related.value.size)

async function load(id: string) {
  loading.value = true
  try {
    const data = await getTaskRelations(id)
    if (id === props.taskId) relations.value = data
  } catch {
    if (id === props.taskId) relations.value = { blocked_by: [], blocking: [] }
  } finally {
    if (id === props.taskId) loading.value = false
  }
}
watch(
  () => props.taskId,
  (id) => {
    adding.value = false
    other.value = ''
    void load(id)
  },
  { immediate: true },
)

// o selo "Bloqueada" do quadro vem do servidor: atualiza as duas pontas
const refreshBoth = (ids: string[]) =>
  Promise.all(ids.map((id) => kanban.reload(id).catch(() => undefined)))

async function add() {
  if (!other.value || busy.value) return
  busy.value = true
  const target = other.value
  try {
    relations.value = await addTaskRelation(props.taskId, kind.value, target)
    other.value = ''
    adding.value = false
    await refreshBoth([props.taskId, target])
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível relacionar as tarefas.'))
  } finally {
    busy.value = false
  }
}

async function remove(item: RelatedTask) {
  busy.value = true
  try {
    await removeTaskRelation(props.taskId, item.id)
    relations.value = {
      blocked_by: relations.value.blocked_by.filter((t) => t.id !== item.id),
      blocking: relations.value.blocking.filter((t) => t.id !== item.id),
    }
    await refreshBoth([props.taskId, item.id])
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível remover a relação.'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="grid gap-2" aria-labelledby="task-relations-title">
    <div class="flex items-center justify-between gap-2">
      <h3 id="task-relations-title" class="flex items-center gap-2 text-13 font-medium text-fg">
        <Link2 :size="15" class="text-fg-muted" aria-hidden="true" />
        Relações
        <span v-if="total" class="font-mono text-12 text-fg-muted">{{ total }}</span>
      </h3>
      <UiButton
        v-if="canEdit && !adding"
        size="sm"
        variant="ghost"
        :icon="Plus"
        @click="adding = true"
      >
        Adicionar
      </UiButton>
    </div>

    <p v-if="loading" class="flex items-center gap-2 text-12 text-fg-muted">
      <UiSpinner :size="12" /> Carregando…
    </p>

    <template v-else>
      <template v-for="section in SECTIONS" :key="section.kind">
        <div v-if="relations[section.kind].length" class="grid gap-1">
          <p class="text-12 text-fg-muted">{{ section.title }}</p>
          <ul class="grid gap-1">
            <li v-for="item in relations[section.kind]" :key="item.id" class="rel-row">
              <component
                :is="item.is_done ? Check : section.kind === 'blocked_by' ? Ban : Link2"
                :size="14"
                :class="
                  item.is_done
                    ? 'text-success'
                    : section.kind === 'blocked_by'
                      ? 'text-danger'
                      : 'text-fg-muted'
                "
                aria-hidden="true"
              />
              <button
                type="button"
                :class="['rel-title', item.is_done ? 'text-fg-muted line-through' : '']"
                @click="emit('open', item.id)"
              >
                {{ item.title }}
              </button>
              <span class="shrink-0 text-12 text-fg-muted">{{ item.status_name }}</span>
              <UiIconButton
                v-if="canEdit"
                :icon="X"
                size="sm"
                :label="`Remover relação com ${item.title}`"
                :disabled="busy"
                @click="remove(item)"
              />
            </li>
          </ul>
        </div>
      </template>
      <p v-if="!total && !adding" class="text-12 text-fg-muted">
        Nenhuma. Marque quando uma tarefa depende de outra para começar.
      </p>
    </template>

    <form
      v-if="adding"
      class="grid gap-2 rounded-card border border-border bg-bg-2 p-3 sm:grid-cols-[150px_1fr_auto]"
      @submit.prevent="add"
    >
      <UiSelect v-model="kind" aria-label="Tipo de relação" :options="KIND_OPTIONS" />
      <UiSelect v-model="other" aria-label="Tarefa" :options="candidates" />
      <div class="flex gap-1">
        <UiButton type="submit" variant="primary" size="sm" :loading="busy" :disabled="!other">
          Relacionar
        </UiButton>
        <UiIconButton :icon="X" size="sm" label="Cancelar" @click="adding = false" />
      </div>
    </form>
  </section>
</template>

<style>
.rel-row {
  display: flex;
  min-height: 34px;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--ds-border);
  border-radius: 8px;
  background: var(--ds-bg-2);
  padding: 2px 4px 2px 10px;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.rel-row:hover {
  border-color: var(--ds-border-strong);
}

.rel-title {
  min-width: 0;
  flex: 1;
  cursor: pointer;
  overflow: hidden;
  border-radius: 4px;
  font-size: var(--text-13);
  color: var(--ds-fg);
  text-align: left;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.rel-title:hover {
  color: var(--ds-accent);
}

.rel-title:focus-visible {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}
</style>

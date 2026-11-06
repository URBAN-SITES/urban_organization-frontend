<script setup lang="ts">
import { Archive, Trash2, X } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiButton, UiIconButton, UiSelect } from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { useKanbanStore } from '../stores'
import type { BulkRequest, Cycle, Epic, Person } from '../types'
import { PRIORITIES } from './priority'

/** Barra flutuante da seleção: muda, arquiva ou exclui várias tarefas de uma vez. */
const selected = defineModel<string[]>('selected', { required: true })
const props = defineProps<{ people: Person[]; cycles: Cycle[]; epics: Epic[] }>()
const kanban = useKanbanStore()
const confirm = useConfirm()
const busy = ref(false)
// os selects voltam ao rótulo depois de aplicar: cada escolha é uma ação
const reset = ref(0)

const statusOptions = computed(() => [
  { value: '', label: 'Mover para…' },
  ...kanban.statuses.map((status) => ({ value: status.id, label: status.name })),
])
const assigneeOptions = computed(() => [
  { value: '', label: 'Responsável…' },
  { value: 'none', label: 'Sem responsável' },
  ...props.people.map((p) => ({ value: p.id, label: p.name || p.email })),
])
const priorityOptions = [
  { value: '', label: 'Prioridade…' },
  ...PRIORITIES.map((p) => ({ value: p.value, label: p.label })),
]
const cycleOptions = computed(() => [
  { value: '', label: 'Ciclo…' },
  { value: 'none', label: 'Sem ciclo' },
  ...props.cycles
    .filter((cycle) => cycle.state !== 'completed')
    .map((cycle) => ({ value: cycle.id, label: cycle.name })),
])
const count = computed(() => selected.value.length)
const plural = (n: number) => (n === 1 ? '1 tarefa' : `${n} tarefas`)

async function apply(change: Omit<BulkRequest, 'task_ids'>, done: string) {
  if (busy.value || !count.value) return
  busy.value = true
  try {
    const n = await kanban.bulk(change, selected.value)
    toast.success(`${plural(n)} ${done}.`)
    if (change.archive || change.delete) selected.value = []
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível alterar as tarefas.'))
  } finally {
    busy.value = false
    reset.value++
  }
}

const pickStatus = (value: string) => value && apply({ status: value }, 'movidas')
const pickAssignee = (value: string) =>
  value && apply({ assignee: value === 'none' ? null : value }, 'atualizadas')
const pickPriority = (value: string) =>
  value && apply({ priority: value as BulkRequest['priority'] }, 'atualizadas')
const epicOptions = computed(() => [
  { value: '', label: 'Épico…' },
  { value: 'none', label: 'Sem épico' },
  ...props.epics
    .filter((epic) => !['done', 'cancelled'].includes(epic.state))
    .map((epic) => ({ value: epic.id, label: epic.name })),
])
const pickEpic = (value: string) =>
  value && apply({ epic: value === 'none' ? null : value }, 'atualizadas')
const pickCycle = (value: string) =>
  value && apply({ cycle: value === 'none' ? null : value }, 'atualizadas')

async function remove() {
  const ok = await confirm({
    title: `Excluir ${plural(count.value)}?`,
    description: 'Elas vão para a lixeira do projeto por 30 dias.',
    confirmLabel: 'Excluir',
    danger: true,
  })
  if (ok) await apply({ delete: true }, 'na lixeira')
}
</script>

<template>
  <Transition name="ui-pop">
    <div
      v-if="count"
      class="bulk-bar"
      role="toolbar"
      aria-label="Ações com as tarefas selecionadas"
    >
      <span class="text-13 font-medium whitespace-nowrap text-fg">
        <span class="font-mono">{{ count }}</span>
        {{ count === 1 ? 'selecionada' : 'selecionadas' }}
      </span>
      <div :key="reset" class="flex flex-wrap items-center gap-2 lg:flex-nowrap">
        <UiSelect
          model-value=""
          aria-label="Mover para"
          :options="statusOptions"
          :disabled="busy"
          class="w-36"
          @update:model-value="pickStatus"
        />
        <UiSelect
          model-value=""
          aria-label="Responsável"
          :options="assigneeOptions"
          :disabled="busy"
          class="w-36"
          @update:model-value="pickAssignee"
        />
        <UiSelect
          model-value=""
          aria-label="Prioridade"
          :options="priorityOptions"
          :disabled="busy"
          class="w-32"
          @update:model-value="pickPriority"
        />
        <UiSelect
          v-if="cycles.length"
          model-value=""
          aria-label="Ciclo"
          :options="cycleOptions"
          :disabled="busy"
          class="w-32"
          @update:model-value="pickCycle"
        />
        <UiSelect
          v-if="epics.length"
          model-value=""
          aria-label="Épico"
          :options="epicOptions"
          :disabled="busy"
          class="w-32"
          @update:model-value="pickEpic"
        />
        <UiButton
          size="sm"
          :icon="Archive"
          :disabled="busy"
          @click="apply({ archive: true }, 'arquivadas')"
        >
          Arquivar
        </UiButton>
        <UiButton size="sm" variant="danger" :icon="Trash2" :disabled="busy" @click="remove">
          Excluir
        </UiButton>
      </div>
      <UiIconButton :icon="X" size="sm" label="Limpar seleção" @click="selected = []" />
    </div>
  </Transition>
</template>

<style>
.bulk-bar {
  position: fixed;
  bottom: calc(16px + 3.5rem + env(safe-area-inset-bottom));
  left: 50%;
  z-index: 40;
  display: flex;
  max-width: calc(100vw - 32px);
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  transform: translateX(-50%);
  border: 1px solid var(--ds-border-strong);
  border-radius: 14px;
  background: var(--ds-surface-1);
  padding: 8px 8px 8px 16px;
  box-shadow: var(--shadow-float);
}

@media (width >= 48rem) {
  .bulk-bar {
    bottom: 24px;
  }
}

@media (width >= 64rem) {
  .bulk-bar {
    flex-wrap: nowrap;
    white-space: nowrap;
  }
}
</style>

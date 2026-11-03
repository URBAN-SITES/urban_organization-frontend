<script setup lang="ts">
import { ArrowRight, MoreHorizontal, Pencil, Plus, RefreshCcw, Trash2 } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import {
  UiButton,
  UiDialog,
  UiEmptyState,
  UiIconButton,
  UiInput,
  UiMenu,
  UiTextarea,
  type MenuItem,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { createCycle, deleteCycle, updateCycle } from '../services'
import type { Cycle, CycleState, Status, Task } from '../types'
import { addDays, cycleProgress, localToday } from '../utils/timeline'
import { shortDate } from './priority'

/** Ciclos (sprints) do projeto: períodos com as tarefas que entram neles e o andamento. */
const cycles = defineModel<Cycle[]>('cycles', { required: true })
const props = defineProps<{
  sectorId: string
  tasks: Task[]
  statuses: Status[]
  canEdit: boolean
}>()
const emit = defineEmits<{ show: [cycleId: string] }>()
const confirm = useConfirm()
const today = localToday()

const GROUPS: { state: CycleState; title: string }[] = [
  { state: 'current', title: 'Em andamento' },
  { state: 'upcoming', title: 'Próximos' },
  { state: 'completed', title: 'Encerrados' },
]
const grouped = computed(() =>
  GROUPS.map((group) => ({
    ...group,
    cycles: cycles.value
      .filter((cycle) => cycle.state === group.state)
      .map((cycle) => ({ ...cycle, stats: breakdown(cycle) })),
  })).filter((group) => group.cycles.length),
)

const category = (task: Task) => props.statuses.find((s) => s.id === task.status_id)?.category
// conta todas as tarefas do ciclo (subtarefas também), como o servidor
function breakdown(cycle: Cycle) {
  const rows = props.tasks.filter((task) => task.cycle_id === cycle.id)
  const done = rows.filter((task) => task.completed_at).length
  const doing = rows.filter((task) => !task.completed_at && category(task) === 'in_progress').length
  const blocked = rows.filter((task) => !task.completed_at && task.is_blocked).length
  return { total: rows.length, done, doing, todo: rows.length - done - doing, blocked }
}
const pct = (part: number, total: number) => (total ? (part * 100) / total : 0)

// ── criar e editar ────────────────────────────────────────────────────────
const dialogOpen = ref(false)
const editing = ref<Cycle | null>(null)
const saving = ref(false)
const form = reactive({ name: '', description: '', start: '', end: '' })
const errors = reactive({ name: '', end: '' })

function openForm(cycle: Cycle | null = null) {
  editing.value = cycle
  const lastEnd = cycles.value
    .map((c) => c.end_date)
    .sort()
    .at(-1)
  const start = cycle?.start_date ?? (lastEnd && lastEnd >= today ? addDays(lastEnd, 1) : today)
  Object.assign(form, {
    name: cycle?.name ?? `Ciclo ${cycles.value.length + 1}`,
    description: cycle?.description ?? '',
    start,
    end: cycle?.end_date ?? addDays(start, 13),
  })
  Object.assign(errors, { name: '', end: '' })
  dialogOpen.value = true
}

async function save() {
  errors.name = form.name.trim() ? '' : 'Dê um nome ao ciclo.'
  errors.end =
    form.start && form.end && form.end >= form.start ? '' : 'O fim precisa ser depois do início.'
  if (errors.name || errors.end || saving.value) return
  saving.value = true
  const payload = {
    name: form.name.trim().slice(0, 100),
    description: form.description,
    start_date: form.start,
    end_date: form.end,
  }
  try {
    const current = editing.value
    const saved = current
      ? await updateCycle(current.id, payload)
      : await createCycle(props.sectorId, payload)
    cycles.value = [...cycles.value.filter((c) => c.id !== saved.id), saved].sort((a, b) =>
      a.start_date.localeCompare(b.start_date),
    )
    toast.success(current ? 'Ciclo atualizado.' : 'Ciclo criado.')
    dialogOpen.value = false
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível salvar o ciclo.'))
  } finally {
    saving.value = false
  }
}

async function remove(cycle: Cycle) {
  const ok = await confirm({
    title: `Excluir “${cycle.name}”?`,
    description: 'As tarefas continuam no projeto, só saem do ciclo.',
    confirmLabel: 'Excluir ciclo',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteCycle(cycle.id)
    cycles.value = cycles.value.filter((c) => c.id !== cycle.id)
    toast.success('Ciclo excluído.')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível excluir o ciclo.'))
  }
}

const actions = (cycle: Cycle): MenuItem[] => [
  { label: 'Editar', icon: Pencil, onSelect: () => openForm(cycle) },
  { label: 'Excluir', icon: Trash2, danger: true, onSelect: () => void remove(cycle) },
]
</script>

<template>
  <section class="grid gap-6" aria-label="Ciclos">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="max-w-xl text-13 text-fg-muted">
        Ciclos são períodos curtos de trabalho. Coloque tarefas num ciclo pelo painel da tarefa e
        acompanhe o andamento aqui.
      </p>
      <UiButton v-if="canEdit && cycles.length" variant="primary" :icon="Plus" @click="openForm()">
        Novo ciclo
      </UiButton>
    </div>

    <UiEmptyState
      v-if="!cycles.length"
      :icon="RefreshCcw"
      title="Nenhum ciclo ainda"
      description="Crie um ciclo de uma ou duas semanas para focar o time num conjunto de tarefas."
    >
      <template v-if="canEdit" #action>
        <UiButton variant="primary" :icon="Plus" @click="openForm()"
          >Criar o primeiro ciclo</UiButton
        >
      </template>
    </UiEmptyState>

    <div v-for="group in grouped" :key="group.state" class="grid gap-3">
      <h2 class="text-12 font-medium tracking-wide text-fg-muted uppercase">
        {{ group.title }} · {{ group.cycles.length }}
      </h2>
      <div class="cy-grid">
        <article
          v-for="cycle in group.cycles"
          :key="cycle.id"
          :class="['cy-card ui-rise', { 'is-current': cycle.state === 'current' }]"
        >
          <header class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate text-16 font-semibold text-fg">{{ cycle.name }}</h3>
              <p class="mt-0.5 text-12 text-fg-muted">
                {{ shortDate(cycle.start_date) }} – {{ shortDate(cycle.end_date) }} ·
                {{ cycleProgress(cycle, today).label }}
              </p>
            </div>
            <UiMenu v-if="canEdit" :items="actions(cycle)" :label="`Ações de ${cycle.name}`">
              <template #trigger="{ props: trigger }">
                <UiIconButton
                  v-bind="trigger"
                  :icon="MoreHorizontal"
                  size="sm"
                  :label="`Ações de ${cycle.name}`"
                />
              </template>
            </UiMenu>
          </header>

          <p v-if="cycle.description" class="line-clamp-2 text-13 text-fg-muted">
            {{ cycle.description }}
          </p>

          <div class="grid gap-2">
            <div class="flex items-baseline justify-between text-12 text-fg-muted">
              <span>
                <span class="font-mono text-14 text-fg"
                  >{{ Math.round(pct(cycle.stats.done, cycle.stats.total)) }}%</span
                >
                concluído
              </span>
              <span>{{ cycle.stats.done }} de {{ cycle.stats.total }} tarefas</span>
            </div>
            <div
              class="cy-stack"
              role="img"
              :aria-label="`${cycle.stats.done} concluídas, ${cycle.stats.doing} em andamento, ${cycle.stats.todo} a fazer`"
            >
              <span
                class="is-done"
                :style="{ width: `${pct(cycle.stats.done, cycle.stats.total)}%` }"
              />
              <span
                class="is-doing"
                :style="{ width: `${pct(cycle.stats.doing, cycle.stats.total)}%` }"
              />
            </div>
            <ul class="flex flex-wrap gap-x-4 gap-y-1 text-12 text-fg-muted">
              <li class="cy-key is-done">{{ cycle.stats.done }} concluídas</li>
              <li class="cy-key is-doing">{{ cycle.stats.doing }} em andamento</li>
              <li class="cy-key">{{ cycle.stats.todo }} a fazer</li>
              <li v-if="cycle.stats.blocked" class="text-danger">
                {{ cycle.stats.blocked }} bloqueadas
              </li>
            </ul>
          </div>

          <div
            v-if="cycle.state !== 'upcoming'"
            class="flex items-center gap-2 text-12 text-fg-muted"
            :title="`${cycleProgress(cycle, today).elapsed}% do período`"
          >
            <span class="uo-meter flex-1" aria-hidden="true">
              <span
                :style="{
                  width: `${cycleProgress(cycle, today).elapsed}%`,
                  '--meter': 'var(--ds-fg-muted)',
                }"
              />
            </span>
            tempo
          </div>

          <UiButton
            size="sm"
            variant="secondary"
            :icon="ArrowRight"
            :disabled="!cycle.stats.total"
            class="justify-self-start"
            @click="emit('show', cycle.id)"
          >
            {{ cycle.stats.total ? 'Ver tarefas no quadro' : 'Sem tarefas ainda' }}
          </UiButton>
        </article>
      </div>
    </div>

    <UiDialog
      v-model:open="dialogOpen"
      :title="editing ? 'Editar ciclo' : 'Novo ciclo'"
      :dismissible="!saving"
    >
      <form id="cycle-form" class="grid gap-4" novalidate @submit.prevent="save">
        <UiInput v-model="form.name" label="Nome" maxlength="100" required :error="errors.name" />
        <div class="grid gap-4 sm:grid-cols-2">
          <UiInput v-model="form.start" type="date" label="Início" required />
          <UiInput v-model="form.end" type="date" label="Fim" required :error="errors.end" />
        </div>
        <UiTextarea
          v-model="form.description"
          label="Objetivo"
          :rows="3"
          placeholder="O que o time quer entregar neste ciclo"
        />
      </form>
      <template #footer>
        <UiButton :disabled="saving" @click="dialogOpen = false">Cancelar</UiButton>
        <UiButton type="submit" form="cycle-form" variant="primary" :loading="saving">
          {{ editing ? 'Salvar' : 'Criar ciclo' }}
        </UiButton>
      </template>
    </UiDialog>
  </section>
</template>

<style>
.cy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 12px;
}

.cy-card {
  display: grid;
  align-content: start;
  gap: 14px;
  border: 1px solid var(--ds-border);
  border-radius: var(--radius-card);
  background: var(--ds-surface-1);
  padding: 16px;
  box-shadow: var(--shadow-card);
  transition:
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}

.cy-card:hover {
  border-color: var(--ds-border-strong);
}

.cy-card.is-current {
  border-color: color-mix(in srgb, var(--ds-accent) 40%, transparent);
  background:
    radial-gradient(120% 80% at 100% 0%, var(--ds-glow), transparent 60%), var(--ds-surface-1);
}

.cy-stack {
  display: flex;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--ds-surface-3);
}

.cy-stack > span {
  height: 100%;
  transition: width var(--dur-slow) var(--ease-out);
}

.cy-stack > .is-done {
  background: var(--ds-success);
}

.cy-stack > .is-doing {
  background: var(--ds-accent);
}

.cy-key {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.cy-key::before {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  content: '';
  background: var(--ds-surface-3);
}

.cy-key.is-done::before {
  background: var(--ds-success);
}

.cy-key.is-doing::before {
  background: var(--ds-accent);
}
</style>

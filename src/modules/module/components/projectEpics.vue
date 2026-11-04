<script setup lang="ts">
import { ArrowRight, Milestone, MoreHorizontal, Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import {
  UiAvatar,
  UiButton,
  UiDialog,
  UiEmptyState,
  UiIconButton,
  UiInput,
  UiMenu,
  UiSelect,
  UiTextarea,
  type MenuItem,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { createEpic, deleteEpic, updateEpic } from '../services'
import type { Epic, EpicState, Person, Task, WriteEpicRequest } from '../types'
import { PROJECT_COLORS } from '../utils/projectAppearance'
import { shortDate } from './priority'

/** Épicos do projeto: objetivos maiores que juntam tarefas, com responsável e meta. */
const epics = defineModel<Epic[]>('epics', { required: true })
const props = defineProps<{
  sectorId: string
  tasks: Task[]
  people: Person[]
  canEdit: boolean
}>()
const emit = defineEmits<{ show: [epicId: string] }>()
const confirm = useConfirm()

const STATES: { value: EpicState; label: string; tone: string }[] = [
  { value: 'planned', label: 'Planejado', tone: 'var(--ds-fg-muted)' },
  { value: 'in_progress', label: 'Em andamento', tone: 'var(--ds-accent)' },
  { value: 'paused', label: 'Pausado', tone: 'var(--ds-warning)' },
  { value: 'done', label: 'Concluído', tone: 'var(--ds-success)' },
  { value: 'cancelled', label: 'Cancelado', tone: 'var(--ds-border-strong)' },
]
const stateOf = (value: EpicState) => STATES.find((s) => s.value === value) ?? STATES[0]!

// andamento calculado das tarefas carregadas: muda na hora quando uma tarefa anda
const rows = computed(() =>
  epics.value.map((epic) => {
    const list = props.tasks.filter((task) => task.epic_id === epic.id)
    const done = list.filter((task) => task.completed_at).length
    const points = list.reduce((sum, task) => sum + (task.estimate ?? 0), 0)
    const pointsDone = list
      .filter((task) => task.completed_at)
      .reduce((sum, task) => sum + (task.estimate ?? 0), 0)
    return { ...epic, total: list.length, done, points, pointsDone }
  }),
)
const pct = (part: number, total: number) => (total ? Math.round((part * 100) / total) : 0)

// ── criar e editar ────────────────────────────────────────────────────────
const dialogOpen = ref(false)
const editing = ref<Epic | null>(null)
const saving = ref(false)
const form = reactive({
  name: '',
  description: '',
  state: 'planned' as EpicState,
  lead: '',
  color: PROJECT_COLORS[0]!.value,
  start: '',
  target: '',
})
const errors = reactive({ name: '', target: '' })
const stateOptions = STATES.map(({ value, label }) => ({ value, label }))
const leadOptions = computed(() => [
  { value: '', label: 'Sem responsável' },
  ...props.people.map((p) => ({ value: p.id, label: p.name || p.email })),
])

function openForm(epic: Epic | null = null) {
  editing.value = epic
  Object.assign(form, {
    name: epic?.name ?? '',
    description: epic?.description ?? '',
    state: epic?.state ?? 'planned',
    lead: epic?.lead_id ?? '',
    color: epic?.color || PROJECT_COLORS[epics.value.length % PROJECT_COLORS.length]!.value,
    start: epic?.start_date ?? '',
    target: epic?.target_date ?? '',
  })
  Object.assign(errors, { name: '', target: '' })
  dialogOpen.value = true
}

async function save() {
  errors.name = form.name.trim() ? '' : 'Dê um nome ao épico.'
  errors.target =
    form.start && form.target && form.target < form.start
      ? 'A meta precisa ser depois do início.'
      : ''
  if (errors.name || errors.target || saving.value) return
  saving.value = true
  const payload: WriteEpicRequest = {
    name: form.name.trim().slice(0, 120),
    description: form.description,
    state: form.state,
    lead: form.lead || null,
    color: form.color,
    start_date: form.start || null,
    target_date: form.target || null,
  }
  try {
    const current = editing.value
    const saved = current
      ? await updateEpic(current.id, payload)
      : await createEpic(props.sectorId, payload)
    epics.value = current
      ? epics.value.map((e) => (e.id === saved.id ? saved : e))
      : [...epics.value, saved]
    toast.success(
      current ? 'Épico atualizado.' : 'Épico criado. Ligue tarefas a ele pelo painel da tarefa.',
    )
    dialogOpen.value = false
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível salvar o épico.'))
  } finally {
    saving.value = false
  }
}

async function remove(epic: Epic) {
  const ok = await confirm({
    title: `Excluir “${epic.name}”?`,
    description: 'As tarefas continuam no projeto, só saem do épico.',
    confirmLabel: 'Excluir épico',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteEpic(epic.id)
    epics.value = epics.value.filter((e) => e.id !== epic.id)
    toast.success('Épico excluído.')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível excluir o épico.'))
  }
}

const actions = (epic: Epic): MenuItem[] => [
  { label: 'Editar', icon: Pencil, onSelect: () => openForm(epic) },
  { label: 'Excluir', icon: Trash2, danger: true, onSelect: () => void remove(epic) },
]
</script>

<template>
  <section class="grid gap-6" aria-label="Épicos">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="max-w-xl text-13 text-fg-muted">
        Épicos juntam as tarefas de um mesmo objetivo, como “Novo checkout” ou “Lançamento do app”,
        com responsável e data de meta.
      </p>
      <UiButton v-if="canEdit && epics.length" variant="primary" :icon="Plus" @click="openForm()">
        Novo épico
      </UiButton>
    </div>

    <UiEmptyState
      v-if="!epics.length"
      :icon="Milestone"
      title="Nenhum épico ainda"
      description="Crie um épico para acompanhar um objetivo maior que várias tarefas."
    >
      <template v-if="canEdit" #action>
        <UiButton variant="primary" :icon="Plus" @click="openForm()"
          >Criar o primeiro épico</UiButton
        >
      </template>
    </UiEmptyState>

    <div v-else class="cy-grid">
      <article
        v-for="epic in rows"
        :key="epic.id"
        class="cy-card ui-rise"
        :style="{ '--epic': epic.color || 'var(--ds-accent)' }"
      >
        <header class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-2.5">
            <span class="ep-dot" aria-hidden="true" />
            <div class="min-w-0">
              <h3 class="truncate text-16 font-semibold text-fg">{{ epic.name }}</h3>
              <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-12 text-fg-muted">
                <span class="ep-state" :style="{ '--tone': stateOf(epic.state).tone }">
                  {{ stateOf(epic.state).label }}
                </span>
                <template v-if="epic.target_date">
                  · meta {{ shortDate(epic.target_date) }}
                </template>
              </p>
            </div>
          </div>
          <UiMenu v-if="canEdit" :items="actions(epic)" :label="`Ações de ${epic.name}`">
            <template #trigger="{ props: trigger }">
              <UiIconButton
                v-bind="trigger"
                :icon="MoreHorizontal"
                size="sm"
                :label="`Ações de ${epic.name}`"
              />
            </template>
          </UiMenu>
        </header>

        <p v-if="epic.description" class="line-clamp-2 text-13 text-fg-muted">
          {{ epic.description }}
        </p>

        <div class="grid gap-2">
          <div class="flex items-baseline justify-between text-12 text-fg-muted">
            <span>
              <span class="font-mono text-14 text-fg">{{ pct(epic.done, epic.total) }}%</span>
              concluído
            </span>
            <span>
              {{ epic.done }} de {{ epic.total }} tarefas
              <template v-if="epic.points"> · {{ epic.pointsDone }}/{{ epic.points }} pts</template>
            </span>
          </div>
          <span
            class="uo-meter"
            role="progressbar"
            :aria-label="`Progresso de ${epic.name}`"
            aria-valuemin="0"
            :aria-valuemax="epic.total"
            :aria-valuenow="epic.done"
          >
            <span :style="{ width: `${pct(epic.done, epic.total)}%`, '--meter': 'var(--epic)' }" />
          </span>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <span v-if="epic.lead_name" class="flex items-center gap-1.5 text-12 text-fg-muted">
            <UiAvatar :name="epic.lead_name" size="xs" />
            {{ epic.lead_name }}
          </span>
          <span v-else class="text-12 text-fg-muted">Sem responsável</span>
          <UiButton
            size="sm"
            variant="secondary"
            :icon="ArrowRight"
            :disabled="!epic.total"
            @click="emit('show', epic.id)"
          >
            {{ epic.total ? 'Ver tarefas' : 'Sem tarefas ainda' }}
          </UiButton>
        </div>
      </article>
    </div>

    <UiDialog
      v-model:open="dialogOpen"
      :title="editing ? 'Editar épico' : 'Novo épico'"
      :dismissible="!saving"
    >
      <form id="epic-form" class="grid gap-4" novalidate @submit.prevent="save">
        <UiInput v-model="form.name" label="Nome" maxlength="120" required :error="errors.name" />
        <div class="grid gap-4 sm:grid-cols-2">
          <UiSelect v-model="form.state" label="Situação" :options="stateOptions" />
          <UiSelect v-model="form.lead" label="Responsável" :options="leadOptions" />
          <UiInput v-model="form.start" type="date" label="Início" />
          <UiInput v-model="form.target" type="date" label="Meta" :error="errors.target" />
        </div>
        <fieldset class="grid gap-2">
          <legend class="mb-2 text-13 font-medium text-fg">Cor</legend>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="color in PROJECT_COLORS"
              :key="color.value"
              class="ep-swatch"
              :style="{ '--swatch': color.value }"
              :title="color.label"
            >
              <input v-model="form.color" type="radio" name="epic-color" :value="color.value" />
              <span class="sr-only">{{ color.label }}</span>
            </label>
          </div>
        </fieldset>
        <UiTextarea
          v-model="form.description"
          label="Objetivo"
          :rows="3"
          placeholder="O que entra neste épico e como saber que terminou"
        />
      </form>
      <template #footer>
        <UiButton :disabled="saving" @click="dialogOpen = false">Cancelar</UiButton>
        <UiButton type="submit" form="epic-form" variant="primary" :loading="saving">
          {{ editing ? 'Salvar' : 'Criar épico' }}
        </UiButton>
      </template>
    </UiDialog>
  </section>
</template>

<style>
.ep-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  margin-top: 7px;
  border-radius: 3px;
  background: var(--epic);
  box-shadow: 0 0 10px color-mix(in srgb, var(--epic) 60%, transparent);
}

.ep-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ds-fg);
}

.ep-state::before {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  content: '';
  background: var(--tone);
}

.ep-swatch {
  position: relative;
  display: grid;
  width: 28px;
  height: 28px;
  cursor: pointer;
  place-items: center;
  border-radius: 8px;
  background: var(--swatch);
}

.ep-swatch input {
  position: absolute;
  inset: 0;
  cursor: pointer;
  opacity: 0;
}

.ep-swatch:has(input:checked) {
  outline: 2px solid var(--ds-fg);
  outline-offset: 2px;
}

.ep-swatch:has(input:focus-visible) {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}
</style>

<script setup lang="ts">
import { Copy, Globe, Plus, Trash2, Workflow } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import {
  UiButton,
  UiCheckbox,
  UiIconButton,
  UiInput,
  UiSelect,
  UiSpinner,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { fetchAllPages } from '@/shared/utils'
import {
  createAutomation,
  deleteAutomation,
  disablePublicLink,
  enablePublicLink,
  getPublicLink,
  listAutomations,
  listLabels,
  listSectorPeople,
  listStatuses,
  updateAutomation,
} from '../services'
import type {
  AutomationAction,
  AutomationRule,
  AutomationTrigger,
  Label,
  Person,
  Status,
} from '../types'
import {
  ACTION_TEXT,
  TRIGGER_TEXT,
  actionNeeds,
  describeRule,
  triggerNeeds,
} from '../utils/automation'
import { PRIORITIES } from './priority'

/** Configurações do projeto: regras automáticas e o link público só de leitura. */
const props = defineProps<{ sectorId: string; canManage: boolean }>()
const confirm = useConfirm()

const rules = ref<AutomationRule[]>([])
const statuses = ref<Status[]>([])
const labels = ref<Label[]>([])
const people = ref<Person[]>([])
const token = ref<string | null>(null)
const loading = ref(true)
const busy = ref(false)
const adding = ref(false)

watch(
  () => props.sectorId,
  async (id) => {
    loading.value = true
    try {
      const [ruleRows, statusRows, labelRows, personRows, link] = await Promise.all([
        listAutomations(id),
        fetchAllPages((page) => listStatuses(id, page)),
        fetchAllPages((page) => listLabels(id, page)),
        fetchAllPages((page) => listSectorPeople(id, page)),
        props.canManage ? getPublicLink(id) : Promise.resolve(null),
      ])
      if (id !== props.sectorId) return
      rules.value = ruleRows
      statuses.value = statusRows
      labels.value = labelRows
      people.value = personRows
      token.value = link
    } catch (cause) {
      toast.error(getErrorMessage(cause, 'Não foi possível carregar as automações.'))
    } finally {
      if (id === props.sectorId) loading.value = false
    }
  },
  { immediate: true },
)

const names = {
  status: (id: string) => statuses.value.find((s) => s.id === id)?.name,
  person: (id: string) => {
    const person = people.value.find((p) => p.id === id)
    return person ? person.name || person.email : undefined
  },
  label: (id: string) => labels.value.find((l) => l.id === id)?.name,
  priority: (value: string) => PRIORITIES.find((p) => p.value === value)?.label,
}

// ── nova regra ──────────────────────────────────────────────────────────────
const draft = reactive({
  name: '',
  trigger: 'created' as AutomationTrigger,
  trigger_value: '',
  action: 'assign' as AutomationAction,
  action_value: '',
})
const triggerOptions = Object.entries(TRIGGER_TEXT).map(([value, label]) => ({ value, label }))
const actionOptions = Object.entries(ACTION_TEXT).map(([value, label]) => ({ value, label }))
const priorityOptions = PRIORITIES.map((p) => ({ value: p.value, label: p.label }))
const statusOptions = computed(() => statuses.value.map((s) => ({ value: s.id, label: s.name })))
const triggerValueOptions = computed(() =>
  triggerNeeds(draft.trigger) === 'status'
    ? [{ value: '', label: 'Qualquer coluna' }, ...statusOptions.value]
    : priorityOptions,
)
const actionValueOptions = computed(() => {
  switch (actionNeeds(draft.action)) {
    case 'person':
      return people.value.map((p) => ({ value: p.id, label: p.name || p.email }))
    case 'priority':
      return priorityOptions
    case 'label':
      return labels.value.map((l) => ({ value: l.id, label: l.name }))
    case 'status':
      return statusOptions.value
    default:
      return []
  }
})
// ao trocar o gatilho ou a ação, o valor volta para a primeira opção válida
watch(
  () => draft.trigger,
  (trigger) => (draft.trigger_value = triggerNeeds(trigger) === 'priority' ? 'urgent' : ''),
)
watch(
  () => draft.action,
  (action) =>
    (draft.action_value =
      actionNeeds(action) === 'days' ? '3' : (actionValueOptions.value[0]?.value ?? '')),
  { immediate: true },
)
const preview = computed(() =>
  describeRule(
    {
      ...draft,
      id: '',
      is_active: true,
      run_count: 0,
      last_run_at: null,
      created_at: '',
    },
    names,
  ),
)
const missingValue = computed(() => {
  const need = actionNeeds(draft.action)
  if (need === 'days') return !/^\d{1,3}$/.test(draft.action_value) || +draft.action_value > 365
  return need !== null && !draft.action_value
})

function openForm() {
  Object.assign(draft, { name: '', trigger: 'created', trigger_value: '', action: 'assign' })
  draft.action_value = actionValueOptions.value[0]?.value ?? ''
  adding.value = true
}

async function save() {
  if (busy.value || missingValue.value) return
  busy.value = true
  try {
    const created = await createAutomation(props.sectorId, {
      name: draft.name.trim() || preview.value.slice(0, 120),
      trigger: draft.trigger,
      trigger_value: draft.trigger_value,
      action: draft.action,
      action_value: actionNeeds(draft.action) ? draft.action_value : '',
      is_active: true,
    })
    rules.value = [...rules.value, created]
    adding.value = false
    toast.success('Automação criada. Ela vale a partir de agora.')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível criar a automação.'))
  } finally {
    busy.value = false
  }
}

async function toggle(rule: AutomationRule, active: boolean) {
  try {
    const saved = await updateAutomation(rule.id, { is_active: active })
    rules.value = rules.value.map((row) => (row.id === rule.id ? saved : row))
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível mudar a automação.'))
  }
}

async function remove(rule: AutomationRule) {
  const ok = await confirm({
    title: `Apagar “${rule.name}”?`,
    description: 'O que ela já fez nas tarefas continua como está.',
    confirmLabel: 'Apagar automação',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteAutomation(rule.id)
    rules.value = rules.value.filter((row) => row.id !== rule.id)
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível apagar a automação.'))
  }
}

// ── link público ────────────────────────────────────────────────────────────
const publicUrl = computed(() => (token.value ? `${window.location.origin}/p/${token.value}` : ''))

async function share(on: boolean) {
  if (busy.value) return
  if (!on) {
    const ok = await confirm({
      title: 'Desligar o link público?',
      description: 'Quem tem o endereço deixa de ver o quadro. Se ligar de novo, o link muda.',
      confirmLabel: 'Desligar',
      danger: true,
    })
    if (!ok) return
  }
  busy.value = true
  try {
    if (on) token.value = await enablePublicLink(props.sectorId)
    else {
      await disablePublicLink(props.sectorId)
      token.value = null
    }
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível mudar o link público.'))
  } finally {
    busy.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    toast.success('Link copiado.')
  } catch {
    toast.error('Não foi possível copiar. Selecione o endereço e copie à mão.')
  }
}
</script>

<template>
  <div class="grid items-start gap-4 xl:grid-cols-2">
    <section class="grid gap-3 uo-card p-[18px]" aria-labelledby="automations-title">
      <div class="flex items-center justify-between gap-2">
        <h2 id="automations-title" class="flex items-center gap-2 text-16 font-semibold text-fg">
          <Workflow :size="17" class="text-fg-muted" aria-hidden="true" />
          Automações
        </h2>
        <UiButton
          v-if="canManage && !adding"
          size="sm"
          variant="ghost"
          :icon="Plus"
          @click="openForm"
        >
          Nova automação
        </UiButton>
      </div>
      <p class="text-13 text-fg-muted">
        Regras que fazem o trabalho repetitivo: quando algo acontece numa tarefa, o projeto reage
        sozinho. Uma regra não dispara outra.
      </p>

      <p v-if="loading" class="flex items-center gap-2 text-13 text-fg-muted">
        <UiSpinner :size="14" /> Carregando…
      </p>
      <template v-else>
        <form
          v-if="adding"
          class="grid gap-3 rounded-lg border border-border p-3"
          @submit.prevent="save"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <UiSelect v-model="draft.trigger" label="Quando" :options="triggerOptions" />
            <UiSelect
              v-if="triggerNeeds(draft.trigger)"
              v-model="draft.trigger_value"
              :label="triggerNeeds(draft.trigger) === 'status' ? 'Coluna' : 'Prioridade'"
              :options="triggerValueOptions"
            />
            <span v-else class="hidden sm:block" />
            <UiSelect v-model="draft.action" label="Então" :options="actionOptions" />
            <UiInput
              v-if="actionNeeds(draft.action) === 'days'"
              v-model="draft.action_value"
              type="number"
              min="0"
              max="365"
              label="Dias a partir de hoje"
            />
            <UiSelect
              v-else-if="actionNeeds(draft.action)"
              v-model="draft.action_value"
              label="Valor"
              :options="actionValueOptions"
            />
          </div>
          <UiInput
            v-model="draft.name"
            label="Nome (opcional)"
            maxlength="120"
            :placeholder="preview"
          />
          <p class="text-12 text-fg-muted">{{ preview }}</p>
          <p
            v-if="
              actionNeeds(draft.action) &&
              !actionValueOptions.length &&
              actionNeeds(draft.action) !== 'days'
            "
            class="text-12 text-fg-muted"
          >
            Este projeto ainda não tem opções para essa ação.
          </p>
          <div class="flex justify-end gap-2">
            <UiButton size="sm" @click="adding = false">Cancelar</UiButton>
            <UiButton
              type="submit"
              size="sm"
              variant="primary"
              :loading="busy"
              :disabled="missingValue"
            >
              Criar automação
            </UiButton>
          </div>
        </form>

        <ul v-if="rules.length" class="grid gap-2">
          <li v-for="rule in rules" :key="rule.id" class="au-rule" :data-off="!rule.is_active">
            <div class="min-w-0 flex-1">
              <p class="truncate text-14 font-medium text-fg">{{ rule.name }}</p>
              <p class="text-12 text-fg-muted">{{ describeRule(rule, names) }}</p>
              <p class="mt-0.5 text-12 text-fg-muted">
                {{
                  rule.run_count
                    ? `Rodou ${rule.run_count} ${rule.run_count === 1 ? 'vez' : 'vezes'}`
                    : 'Ainda não rodou'
                }}
              </p>
            </div>
            <template v-if="canManage">
              <UiCheckbox
                :model-value="rule.is_active"
                :aria-label="`${rule.is_active ? 'Pausar' : 'Ligar'} ${rule.name}`"
                @update:model-value="toggle(rule, $event)"
              />
              <UiIconButton
                :icon="Trash2"
                size="sm"
                :label="`Apagar ${rule.name}`"
                @click="remove(rule)"
              />
            </template>
          </li>
        </ul>
        <p v-else-if="!adding" class="text-13 text-fg-muted">
          Nenhuma automação ainda. Exemplo: quando uma tarefa entra em Concluído, avisar quem
          gerencia o projeto.
        </p>
      </template>
    </section>

    <section
      v-if="canManage"
      class="grid gap-3 uo-card p-[18px]"
      aria-labelledby="public-link-title"
    >
      <h2 id="public-link-title" class="flex items-center gap-2 text-16 font-semibold text-fg">
        <Globe :size="17" class="text-fg-muted" aria-hidden="true" />
        Link público
      </h2>
      <p class="text-13 text-fg-muted">
        Quem tiver o endereço vê as colunas e as tarefas deste projeto, sem entrar na conta e sem
        poder mudar nada. Pessoas, descrições, comentários e arquivos não aparecem.
      </p>
      <template v-if="!loading">
        <div v-if="token" class="flex flex-wrap items-center gap-2">
          <UiInput
            :model-value="publicUrl"
            readonly
            aria-label="Endereço do link público"
            class="min-w-0 flex-1"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <UiButton size="sm" :icon="Copy" @click="copy">Copiar</UiButton>
          <UiButton size="sm" variant="danger" :disabled="busy" @click="share(false)">
            Desligar
          </UiButton>
        </div>
        <div v-else>
          <UiButton size="sm" variant="primary" :icon="Globe" :loading="busy" @click="share(true)">
            Criar link público
          </UiButton>
        </div>
      </template>
    </section>
  </div>
</template>

<style>
.au-rule {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--ds-border);
  border-radius: 10px;
  padding: 10px 12px;
}

.au-rule[data-off='true'] {
  opacity: 0.6;
}
</style>

<script setup lang="ts">
import { Check, Inbox, Send, X } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import {
  UiButton,
  UiDialog,
  UiEmptyState,
  UiInput,
  UiSelect,
  UiSpinner,
  UiTabs,
  UiTextarea,
} from '@/shared/components'
import { acceptIntake, createIntake, declineIntake, listIntake } from '../services'
import { useKanbanStore } from '../stores'
import type { IntakeRequest, Person, Task } from '../types'
import { PRIORITIES } from './priority'

/**
 * Caixa de pedidos do projeto: qualquer pessoa com acesso pede; quem edita aceita
 * (vira tarefa) ou recusa com um motivo. Quem só lê vê os próprios pedidos.
 */
const props = defineProps<{ sectorId: string; canEdit: boolean; people: Person[] }>()
const emit = defineEmits<{ open: [taskId: string] }>()
const kanban = useKanbanStore()

const rows = ref<IntakeRequest[]>([])
const loading = ref(true)
const tab = ref('pending')
const draft = reactive({ title: '', description: '' })
const sending = ref(false)

watch(
  () => props.sectorId,
  async (id) => {
    loading.value = true
    try {
      const data = await listIntake(id)
      if (id === props.sectorId) rows.value = data
    } catch (cause) {
      toast.error(getErrorMessage(cause, 'Não foi possível carregar os pedidos.'))
    } finally {
      if (id === props.sectorId) loading.value = false
    }
  },
  { immediate: true },
)
const pending = computed(() => rows.value.filter((row) => row.state === 'pending'))
const answered = computed(() => rows.value.filter((row) => row.state !== 'pending'))
const tabs = computed(() => [
  { value: 'pending', label: 'Aguardando', count: pending.value.length },
  { value: 'answered', label: 'Respondidos', count: answered.value.length },
])
const shown = computed(() => (tab.value === 'pending' ? pending.value : answered.value))

async function send() {
  const title = draft.title.trim()
  if (!title || sending.value) return
  sending.value = true
  try {
    const created = await createIntake(props.sectorId, {
      title: title.slice(0, 255),
      description: draft.description,
    })
    rows.value = [created, ...rows.value]
    Object.assign(draft, { title: '', description: '' })
    tab.value = 'pending'
    toast.success(
      props.canEdit
        ? 'Pedido registrado.'
        : 'Pedido enviado. Você recebe um aviso quando ele for respondido.',
    )
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível enviar o pedido.'))
  } finally {
    sending.value = false
  }
}

// ── responder ─────────────────────────────────────────────────────────────
const target = ref<IntakeRequest | null>(null)
const mode = ref<'accept' | 'decline'>('accept')
const dialogOpen = ref(false)
const busy = ref(false)
const answer = reactive({
  status: '',
  priority: 'medium' as Task['priority'],
  assignee: '',
  note: '',
})
const statusOptions = computed(() =>
  kanban.statuses.map((status) => ({ value: status.id, label: status.name })),
)
const priorityOptions = PRIORITIES.map((p) => ({ value: p.value, label: p.label }))
const peopleOptions = computed(() => [
  { value: '', label: 'Sem responsável' },
  ...props.people.map((p) => ({ value: p.id, label: p.name || p.email })),
])

function openAnswer(row: IntakeRequest, kind: 'accept' | 'decline') {
  target.value = row
  mode.value = kind
  Object.assign(answer, {
    status: kanban.statuses[0]?.id ?? '',
    priority: 'medium',
    assignee: '',
    note: '',
  })
  dialogOpen.value = true
}

async function confirmAnswer() {
  const row = target.value
  if (!row || busy.value) return
  busy.value = true
  try {
    const saved =
      mode.value === 'accept'
        ? await acceptIntake(row.id, {
            ...(answer.status && { status: answer.status }),
            priority: answer.priority,
            assignee: answer.assignee || null,
          })
        : await declineIntake(row.id, answer.note.trim())
    rows.value = rows.value.map((item) => (item.id === saved.id ? saved : item))
    if (saved.task_id) await kanban.load(props.sectorId).catch(() => undefined)
    dialogOpen.value = false
    toast.success(
      mode.value === 'accept'
        ? `Pedido aceito: virou ${saved.task_key ?? 'tarefa'}.`
        : 'Pedido recusado. Quem pediu foi avisado.',
    )
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível responder o pedido.'))
  } finally {
    busy.value = false
  }
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
</script>

<template>
  <section class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]" aria-label="Pedidos">
    <div class="grid gap-3">
      <UiTabs v-model="tab" :tabs="tabs" label="Pedidos">
        <div class="grid gap-2 pt-4">
          <p v-if="loading" class="flex items-center gap-2 text-13 text-fg-muted">
            <UiSpinner :size="14" /> Carregando…
          </p>
          <UiEmptyState
            v-else-if="!shown.length"
            :icon="Inbox"
            :title="tab === 'pending' ? 'Nenhum pedido aguardando' : 'Nenhum pedido respondido'"
            :description="
              canEdit
                ? 'Pedidos de quem não edita o projeto chegam aqui antes de virar tarefa.'
                : 'Os pedidos que você enviar aparecem aqui com a resposta.'
            "
          />
          <article v-for="row in shown" v-else :key="row.id" class="in-card ui-rise">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="text-14 font-semibold text-fg">{{ row.title }}</h3>
                <p class="text-12 text-fg-muted">
                  {{ row.requester_name ?? 'Alguém' }} · {{ when(row.created_at) }}
                </p>
              </div>
              <span
                v-if="row.state !== 'pending'"
                :class="['in-badge', row.state === 'accepted' ? 'is-ok' : 'is-no']"
              >
                {{ row.state === 'accepted' ? 'Aceito' : 'Recusado' }}
              </span>
            </div>
            <p v-if="row.description" class="text-13 whitespace-pre-line text-fg-muted">
              {{ row.description }}
            </p>
            <p v-if="row.state === 'declined' && row.decision_note" class="in-note">
              {{ row.decided_by_name ?? 'Resposta' }}: {{ row.decision_note }}
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <template v-if="row.state === 'pending' && canEdit">
                <UiButton
                  size="sm"
                  variant="primary"
                  :icon="Check"
                  @click="openAnswer(row, 'accept')"
                >
                  Aceitar
                </UiButton>
                <UiButton size="sm" :icon="X" @click="openAnswer(row, 'decline')">Recusar</UiButton>
              </template>
              <UiButton
                v-if="row.task_id && kanban.tasks.some((t) => t.id === row.task_id)"
                size="sm"
                variant="ghost"
                @click="emit('open', row.task_id)"
              >
                Abrir {{ row.task_key ?? 'tarefa' }}
              </UiButton>
              <span v-else-if="row.task_key" class="text-12 text-fg-muted">
                Virou {{ row.task_key }}
              </span>
            </div>
          </article>
        </div>
      </UiTabs>
    </div>

    <form class="grid gap-3 uo-card p-4" @submit.prevent="send">
      <h2 class="text-14 font-semibold text-fg">Fazer um pedido</h2>
      <p class="text-12 text-fg-muted">
        Descreva o que precisa. Quem cuida do projeto decide se vira tarefa.
      </p>
      <UiInput v-model="draft.title" label="O que você precisa" maxlength="255" />
      <UiTextarea
        v-model="draft.description"
        label="Detalhes"
        :rows="4"
        placeholder="Contexto, prazo desejado, links…"
      />
      <UiButton
        type="submit"
        variant="primary"
        :icon="Send"
        :loading="sending"
        :disabled="!draft.title.trim()"
      >
        Enviar pedido
      </UiButton>
    </form>

    <UiDialog
      v-model:open="dialogOpen"
      :title="mode === 'accept' ? 'Aceitar pedido' : 'Recusar pedido'"
      :description="target?.title"
      :dismissible="!busy"
    >
      <form id="intake-form" class="grid gap-4" @submit.prevent="confirmAnswer">
        <template v-if="mode === 'accept'">
          <p class="text-13 text-fg-muted">
            Vira uma tarefa do projeto, e quem pediu passa a seguir o andamento.
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <UiSelect v-model="answer.status" label="Coluna" :options="statusOptions" />
            <UiSelect v-model="answer.priority" label="Prioridade" :options="priorityOptions" />
            <UiSelect
              v-model="answer.assignee"
              label="Responsável"
              class="sm:col-span-2"
              :options="peopleOptions"
            />
          </div>
        </template>
        <UiTextarea
          v-else
          v-model="answer.note"
          label="Motivo (opcional)"
          :rows="3"
          maxlength="500"
          placeholder="Ex.: já existe a tarefa DES-12, ou fica para o próximo ciclo."
        />
      </form>
      <template #footer>
        <UiButton :disabled="busy" @click="dialogOpen = false">Cancelar</UiButton>
        <UiButton
          type="submit"
          form="intake-form"
          :variant="mode === 'accept' ? 'primary' : 'danger'"
          :loading="busy"
        >
          {{ mode === 'accept' ? 'Criar tarefa' : 'Recusar' }}
        </UiButton>
      </template>
    </UiDialog>
  </section>
</template>

<style>
.in-card {
  display: grid;
  gap: 10px;
  border: 1px solid var(--ds-border);
  border-radius: var(--radius-card);
  background: var(--ds-surface-1);
  padding: 14px 16px;
}

.in-badge {
  display: inline-flex;
  height: 22px;
  align-items: center;
  border-radius: 999px;
  padding-inline: 9px;
  font-size: var(--text-12);
  font-weight: 500;
}

.in-badge.is-ok {
  background: var(--ds-success-soft);
  color: var(--ds-success);
}

.in-badge.is-no {
  background: var(--ds-surface-2);
  color: var(--ds-fg-muted);
}

.in-note {
  border-left: 2px solid var(--ds-border-strong);
  padding-left: 10px;
  font-size: var(--text-13);
  color: var(--ds-fg-muted);
}
</style>

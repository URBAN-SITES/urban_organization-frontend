<script setup lang="ts">
import { Play, Plus, Square, X } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { useAuthStore } from '@/modules/auth'
import { UiButton, UiIconButton, UiInput } from '@/shared/components'
import { addTaskTime, deleteTimeEntry, getTaskTime } from '../services'
import { useTimerStore } from '../stores/timer'
import type { TimeEntry } from '../types'
import { clock, formatMinutes, parseDuration } from '../utils/duration'

/** Tempo gasto na tarefa: cronômetro, lançamento manual e a lista de registros. */
const props = defineProps<{ taskId: string; canEdit: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const auth = useAuthStore()
const timer = useTimerStore()

const total = ref(0)
const entries = ref<TimeEntry[]>([])
const busy = ref(false)
const adding = ref(false)
const draft = reactive({ amount: '', date: '', note: '' })
const amountError = ref('')

async function load(id = props.taskId) {
  try {
    const data = await getTaskTime(id)
    if (id !== props.taskId) return
    total.value = data.total_minutes
    entries.value = data.entries.filter((entry) => entry.ended_at)
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível carregar o tempo da tarefa.'))
  }
}
watch(
  () => props.taskId,
  (id) => {
    total.value = 0
    entries.value = []
    void load(id)
  },
  { immediate: true },
)
// parar o cronômetro em outra tela também atualiza a lista desta tarefa
watch(
  () => timer.version,
  () => void load(),
)

const runningHere = computed(() => timer.running?.task_id === props.taskId)

async function toggle() {
  if (busy.value) return
  busy.value = true
  try {
    if (runningHere.value) {
      const stopped = await timer.stop()
      if (stopped) toast.success(`${formatMinutes(stopped.minutes)} registrados.`)
    } else {
      const other = timer.running
      await timer.start(props.taskId)
      if (other) toast.info(`O cronômetro de “${other.task_title}” foi parado.`)
    }
    emit('changed')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível usar o cronômetro.'))
  } finally {
    busy.value = false
  }
}

async function add() {
  const minutes = parseDuration(draft.amount)
  amountError.value = minutes ? '' : 'Use 45, 45m, 1h30 ou 1:30 (até 24 h).'
  if (!minutes || busy.value) return
  busy.value = true
  try {
    const entry = await addTaskTime(props.taskId, {
      minutes,
      ...(draft.date && { date: draft.date }),
      note: draft.note.trim(),
    })
    entries.value = [entry, ...entries.value]
    total.value += entry.minutes
    Object.assign(draft, { amount: '', date: '', note: '' })
    adding.value = false
    emit('changed')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível lançar o tempo.'))
  } finally {
    busy.value = false
  }
}

async function remove(entry: TimeEntry) {
  if (busy.value) return
  busy.value = true
  try {
    await deleteTimeEntry(entry.id)
    entries.value = entries.value.filter((row) => row.id !== entry.id)
    total.value = Math.max(0, total.value - entry.minutes)
    emit('changed')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível apagar o registro.'))
  } finally {
    busy.value = false
  }
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
</script>

<template>
  <section aria-labelledby="task-time" class="grid gap-2">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 id="task-time" class="text-13 font-semibold text-fg">
        Tempo
        <span v-if="total" class="font-normal text-fg-muted">{{ formatMinutes(total) }}</span>
      </h3>
      <div v-if="canEdit" class="flex items-center gap-2">
        <UiButton
          size="sm"
          :variant="runningHere ? 'primary' : 'secondary'"
          :icon="runningHere ? Square : Play"
          :loading="busy && !adding"
          @click="toggle"
        >
          <template v-if="runningHere && timer.running">
            Parar <span class="font-mono">{{ clock(timer.running.started_at, timer.now) }}</span>
          </template>
          <template v-else>Iniciar cronômetro</template>
        </UiButton>
        <UiButton size="sm" variant="ghost" :icon="Plus" @click="adding = !adding">
          Lançar
        </UiButton>
      </div>
    </div>

    <form
      v-if="adding && canEdit"
      class="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[110px_150px_minmax(0,1fr)]"
      @submit.prevent="add"
    >
      <UiInput
        v-model="draft.amount"
        label="Duração"
        placeholder="1h30"
        :error="amountError"
        inputmode="text"
      />
      <UiInput v-model="draft.date" type="date" label="Dia" />
      <UiInput v-model="draft.note" label="O que foi feito" maxlength="255" />
      <div class="flex justify-end gap-2 sm:col-span-3">
        <UiButton size="sm" @click="adding = false">Cancelar</UiButton>
        <UiButton type="submit" size="sm" variant="primary" :loading="busy">Lançar tempo</UiButton>
      </div>
    </form>

    <ul v-if="entries.length" class="grid gap-1">
      <li
        v-for="entry in entries.slice(0, 8)"
        :key="entry.id"
        class="group flex items-center gap-2 text-13"
      >
        <span class="w-20 shrink-0 font-mono whitespace-nowrap text-fg">{{
          formatMinutes(entry.minutes)
        }}</span>
        <span class="min-w-0 flex-1 truncate text-fg-muted">
          {{ entry.user_name ?? 'Alguém' }} · {{ day(entry.started_at) }}
          <template v-if="entry.note"> · {{ entry.note }}</template>
        </span>
        <UiIconButton
          v-if="entry.user_id === auth.user?.id"
          :icon="X"
          size="sm"
          :label="`Apagar ${formatMinutes(entry.minutes)} de ${day(entry.started_at)}`"
          :disabled="busy"
          class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
          @click="remove(entry)"
        />
      </li>
    </ul>
    <p v-if="entries.length > 8" class="text-12 text-fg-muted">
      e mais {{ entries.length - 8 }} registros
    </p>
  </section>
</template>

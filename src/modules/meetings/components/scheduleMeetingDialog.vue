<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/modules/auth'
import type { Person } from '@/modules/module'
import { UiButton, UiCheckbox, UiDialog, UiInput, UiTextarea } from '@/shared/components'
import type { UUID } from '@/shared/types'
import { createMeeting, updateMeeting } from '../services'
import type { Meeting } from '../types'
import { fromIso, toIso } from '../utils'

/** Agendar ou editar uma reunião do projeto. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ sectorId: UUID; people: Person[]; meeting?: Meeting | null }>()
const emit = defineEmits<{ saved: [meeting: Meeting] }>()
const auth = useAuthStore()

const form = reactive({ title: '', description: '', date: '', start: '', end: '' })
const invited = ref<UUID[]>([])
const saving = ref(false)
const error = ref('')
const errors = reactive({ title: '', when: '' })

const others = computed(() => props.people.filter((person) => person.id !== auth.user?.id))

function nextHalfHour() {
  const d = new Date()
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0)
  return d
}

watch(open, (value) => {
  if (!value) return
  error.value = ''
  errors.title = ''
  errors.when = ''
  const current = props.meeting
  const starts = current ? current.starts_at : nextHalfHour().toISOString()
  const ends = current
    ? current.ends_at
    : new Date(new Date(starts).getTime() + 60 * 60 * 1000).toISOString()
  Object.assign(form, {
    title: current?.title ?? '',
    description: current?.description ?? '',
    date: fromIso(starts).date,
    start: fromIso(starts).time,
    end: fromIso(ends).time,
  })
  invited.value = current ? current.participants.map((p) => p.id) : []
})

function toggle(id: UUID, value: boolean) {
  invited.value = value ? [...invited.value, id] : invited.value.filter((item) => item !== id)
}

async function save() {
  errors.title = form.title.trim() ? '' : 'Dê um título para a reunião.'
  errors.when =
    form.date && form.start && form.end
      ? form.end > form.start
        ? ''
        : 'O fim precisa ser depois do início.'
      : 'Informe a data e os horários.'
  if (errors.title || errors.when || saving.value) return
  saving.value = true
  error.value = ''
  const input = {
    title: form.title.trim(),
    description: form.description.trim(),
    starts_at: toIso(form.date, form.start),
    ends_at: toIso(form.date, form.end),
    participants: invited.value,
  }
  try {
    const saved = props.meeting
      ? await updateMeeting(props.meeting.id, input)
      : await createMeeting(props.sectorId, input)
    emit('saved', saved)
    open.value = false
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Tente novamente.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiDialog
    v-model:open="open"
    :title="meeting ? 'Editar reunião' : 'Agendar reunião'"
    description="Só quem for convidado recebe acesso à sala."
    :dismissible="!saving"
  >
    <form id="meeting-form" class="grid gap-4" novalidate @submit.prevent="save">
      <UiInput v-model="form.title" label="Título" required :error="errors.title" />
      <UiTextarea v-model="form.description" label="Descrição" :rows="3" />
      <fieldset class="grid gap-1.5">
        <legend class="mb-1.5 text-13 font-medium text-fg">Quando</legend>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <UiInput v-model="form.date" type="date" aria-label="Data da reunião" />
          <UiInput v-model="form.start" type="time" aria-label="Horário de início" />
          <UiInput v-model="form.end" type="time" aria-label="Horário de fim" />
        </div>
        <p v-if="errors.when" role="alert" class="text-12 text-danger">{{ errors.when }}</p>
      </fieldset>
      <fieldset class="grid gap-2">
        <legend class="mb-1 text-13 font-medium text-fg">Participantes</legend>
        <p v-if="!others.length" class="text-13 text-fg-muted">
          Só você tem acesso a este projeto por enquanto.
        </p>
        <ul v-else class="grid max-h-56 gap-2 overflow-y-auto">
          <li v-for="person in others" :key="person.id">
            <UiCheckbox
              :model-value="invited.includes(person.id)"
              :label="person.name || person.email"
              @update:model-value="toggle(person.id, $event)"
            />
          </li>
        </ul>
        <p class="text-12 text-fg-muted">Você entra como organizador.</p>
      </fieldset>
      <p v-if="error" role="alert" class="text-13 text-danger">{{ error }}</p>
    </form>
    <template #footer>
      <UiButton :disabled="saving" @click="open = false">Cancelar</UiButton>
      <UiButton type="submit" form="meeting-form" variant="primary" :loading="saving">
        {{ meeting ? 'Salvar' : 'Agendar' }}
      </UiButton>
    </template>
  </UiDialog>
</template>

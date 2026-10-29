<script setup lang="ts">
import { CalendarPlus, ChevronDown, MoreHorizontal, Pencil, Trash2, Video } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import type { Person } from '@/modules/module'
import {
  UiAvatar,
  UiBadge,
  UiButton,
  UiEmptyState,
  UiErrorState,
  UiIconButton,
  UiMenu,
  type MenuItem,
  UiPanel,
  UiSkeleton,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import type { UUID } from '@/shared/types'
import { deleteMeeting, listProjectMeetings } from '../services'
import type { Meeting } from '../types'
import { meetingPhase, meetingWhen } from '../utils'
import MeetingRecordings from './meetingRecordings.vue'
import ScheduleMeetingDialog from './scheduleMeetingDialog.vue'

/** Aba Reuniões do projeto: próximas, ao vivo e histórico com gravações. */
const props = defineProps<{ sectorId: UUID; canEdit: boolean; people: Person[] }>()
const router = useRouter()
const confirm = useConfirm()

const upcoming = ref<Meeting[]>([])
const past = ref<Meeting[]>([])
const loading = ref(true)
const error = ref('')
const dialogOpen = ref(false)
const editing = ref<Meeting | null>(null)
const expanded = ref<UUID | null>(null)
const now = ref(new Date())
const timer = window.setInterval(() => (now.value = new Date()), 30_000)
onBeforeUnmount(() => window.clearInterval(timer))

async function load() {
  loading.value = true
  error.value = ''
  try {
    ;[upcoming.value, past.value] = await Promise.all([
      listProjectMeetings(props.sectorId, 'upcoming'),
      listProjectMeetings(props.sectorId, 'past'),
    ])
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Tente novamente.'
  } finally {
    loading.value = false
  }
}
watch(() => props.sectorId, load, { immediate: true })

const live = computed(() => upcoming.value.filter((m) => meetingPhase(m, now.value) === 'live'))
const later = computed(() =>
  upcoming.value.filter((m) => meetingPhase(m, now.value) === 'upcoming'),
)

function schedule() {
  editing.value = null
  dialogOpen.value = true
}

function menu(meeting: Meeting): MenuItem[] {
  return [
    {
      label: 'Editar',
      icon: Pencil,
      onSelect: () => {
        editing.value = meeting
        dialogOpen.value = true
      },
    },
    { label: 'Cancelar reunião', icon: Trash2, danger: true, onSelect: () => cancel(meeting) },
  ]
}

async function cancel(meeting: Meeting) {
  const ok = await confirm({
    title: `Cancelar "${meeting.title}"?`,
    description: 'A reunião sai da agenda e as gravações dela são apagadas.',
    confirmLabel: 'Cancelar reunião',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteMeeting(meeting.id)
    toast.success('Reunião cancelada.')
    await load()
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  }
}

function onSaved() {
  toast.success(editing.value ? 'Reunião atualizada.' : 'Reunião agendada.')
  void load()
}

const enter = (meeting: Meeting) => router.push(`/reunioes/${meeting.id}`)
</script>

<template>
  <div class="grid gap-4">
    <div v-if="loading" class="grid gap-3" aria-label="Carregando reuniões">
      <UiSkeleton v-for="n in 3" :key="n" class="h-20 rounded-card" />
    </div>

    <UiErrorState
      v-else-if="error"
      title="Não foi possível carregar as reuniões"
      :description="error"
      @retry="load"
    />

    <template v-else>
      <UiEmptyState
        v-if="!upcoming.length && !past.length"
        :icon="Video"
        title="Nenhuma reunião ainda"
        :description="
          canEdit
            ? 'Agende uma reunião com quem participa do projeto. Dá para gravar e rever depois.'
            : 'Quando alguém agendar uma reunião neste projeto, ela aparece aqui.'
        "
      >
        <template v-if="canEdit" #action>
          <UiButton variant="primary" :icon="CalendarPlus" @click="schedule">
            Agendar reunião
          </UiButton>
        </template>
      </UiEmptyState>

      <template v-else>
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-16 font-semibold">Agenda</h2>
          <UiButton v-if="canEdit" :icon="CalendarPlus" @click="schedule">
            Agendar reunião
          </UiButton>
        </div>

        <UiPanel v-if="live.length || later.length" title="Próximas">
          <ul class="-mx-1 grid gap-1">
            <li
              v-for="meeting in [...live, ...later]"
              :key="meeting.id"
              class="grid gap-2 px-1 py-2"
            >
              <div class="flex flex-wrap items-center gap-3">
                <div class="min-w-0 flex-1">
                  <p class="flex items-center gap-2 text-14 text-fg">
                    <span class="truncate font-medium">{{ meeting.title }}</span>
                    <UiBadge v-if="live.includes(meeting)" tone="success">Agora</UiBadge>
                  </p>
                  <p class="text-13 text-fg-muted">{{ meetingWhen(meeting) }}</p>
                </div>
                <div
                  class="flex -space-x-1.5"
                  :title="meeting.participants.map((p) => p.name).join(', ')"
                >
                  <UiAvatar
                    v-for="person in meeting.participants.slice(0, 4)"
                    :key="person.id"
                    :name="person.name"
                    :src="person.avatar_url"
                    size="xs"
                  />
                  <span class="sr-only">{{ meeting.participants.length }} participantes</span>
                </div>
                <UiButton
                  v-if="meeting.can_join"
                  :variant="live.includes(meeting) ? 'primary' : 'secondary'"
                  :icon="Video"
                  @click="enter(meeting)"
                >
                  Entrar
                </UiButton>
                <UiMenu
                  v-if="meeting.can_manage"
                  :items="menu(meeting)"
                  :label="`Ações de ${meeting.title}`"
                  placement="bottom-end"
                >
                  <template #trigger="{ props: trigger }">
                    <UiIconButton
                      v-bind="trigger"
                      :icon="MoreHorizontal"
                      :label="`Ações de ${meeting.title}`"
                    />
                  </template>
                </UiMenu>
              </div>
              <!-- gravações feitas enquanto a reunião ainda está na agenda -->
              <button
                v-if="meeting.recording_count && meeting.can_join"
                type="button"
                class="w-fit cursor-pointer rounded-control text-13 text-fg-muted underline-offset-2 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                :aria-expanded="expanded === meeting.id"
                @click="expanded = expanded === meeting.id ? null : meeting.id"
              >
                {{
                  meeting.recording_count === 1
                    ? 'Ver 1 gravação'
                    : `Ver ${meeting.recording_count} gravações`
                }}
              </button>
              <MeetingRecordings
                v-if="expanded === meeting.id"
                :meeting-id="meeting.id"
                :can-manage="meeting.can_manage"
              />
            </li>
          </ul>
        </UiPanel>

        <UiPanel v-if="past.length" title="Histórico" description="Reuniões que já aconteceram">
          <ul class="-mx-1 grid gap-1">
            <li v-for="meeting in past" :key="meeting.id" class="grid gap-2 px-1 py-2">
              <button
                type="button"
                class="flex w-full cursor-pointer items-center gap-3 rounded-control text-left focus-visible:outline-2 focus-visible:outline-accent"
                :aria-expanded="expanded === meeting.id"
                @click="expanded = expanded === meeting.id ? null : meeting.id"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-14 font-medium text-fg">{{
                    meeting.title
                  }}</span>
                  <span class="block text-13 text-fg-muted">{{ meetingWhen(meeting) }}</span>
                </span>
                <span class="text-13 text-fg-muted">
                  {{
                    meeting.recording_count === 1
                      ? '1 gravação'
                      : `${meeting.recording_count} gravações`
                  }}
                </span>
                <ChevronDown
                  :size="16"
                  :class="[
                    'text-fg-muted transition-transform duration-(--dur-fast)',
                    expanded === meeting.id ? 'rotate-180' : '',
                  ]"
                  aria-hidden="true"
                />
              </button>
              <template v-if="expanded === meeting.id">
                <p v-if="!meeting.can_join" class="text-13 text-fg-muted">
                  Só quem foi convidado pode ver as gravações.
                </p>
                <MeetingRecordings
                  v-else
                  :meeting-id="meeting.id"
                  :can-manage="meeting.can_manage"
                />
              </template>
            </li>
          </ul>
        </UiPanel>
      </template>
    </template>

    <ScheduleMeetingDialog
      v-model:open="dialogOpen"
      :sector-id="sectorId"
      :people="people"
      :meeting="editing"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  Circle,
  CircleStop,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  Users,
  Video,
  VideoOff,
  Volume2,
  X,
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  UiAvatar,
  UiBadge,
  UiButton,
  UiCheckbox,
  UiEmptyState,
  UiIconButton,
  UiSkeleton,
  UiSpinner,
  UiSwitch,
  UiTooltip,
} from '@/shared/components'
import ParticipantTile from '../components/participantTile.vue'
import { useMeetingRoom } from '../composables/room'
import {
  getMeeting,
  joinMeeting,
  listRecordings,
  MeetingRequestError,
  startRecording,
  stopRecording,
} from '../services'
import type { Meeting } from '../types'
import { meetingWhen, recordingError } from '../utils'

/** Sala de uma reunião: pré-entrada com aviso de gravação, chamada e saída. */
const route = useRoute()
const router = useRouter()
const meetingId = computed(() => String(route.params.meetingId))
const lk = useMeetingRoom()

const meeting = ref<Meeting | null>(null)
const loadError = ref('')
const phase = ref<'loading' | 'prejoin' | 'joining' | 'room' | 'left'>('loading')
const joinError = ref('')
const wantMic = ref(true)
const wantCamera = ref(true)
const consent = ref(false)
const canRecord = ref(false)
const recordingBusy = ref(false)
const peopleOpen = ref(false)

const back = computed(() =>
  meeting.value ? `/setores/${meeting.value.sector_id}?view=meetings` : '/',
)
const stateLabel = computed(
  () =>
    ({
      idle: '',
      connecting: 'Conectando…',
      connected: '',
      reconnecting: 'Conexão instável. Reconectando…',
      disconnected: 'Desconectado',
    })[lk.state.value],
)
const gridClass = computed(() => {
  const count = lk.tiles.value.length
  if (count <= 1) return 'grid-cols-1'
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2'
  return 'grid-cols-2 lg:grid-cols-3'
})

async function load() {
  phase.value = 'loading'
  loadError.value = ''
  try {
    meeting.value = await getMeeting(meetingId.value)
    phase.value = 'prejoin'
  } catch (cause) {
    loadError.value = cause instanceof Error ? cause.message : 'Tente novamente.'
  }
}
watch(meetingId, load, { immediate: true })

async function join() {
  if (!consent.value || phase.value === 'joining') return
  phase.value = 'joining'
  joinError.value = ''
  try {
    const info = await joinMeeting(meetingId.value)
    canRecord.value = info.can_record
    await lk.connect(info.url, info.token, { mic: wantMic.value, camera: wantCamera.value })
    phase.value = 'room'
  } catch (cause) {
    await lk.leave()
    phase.value = 'prejoin'
    joinError.value =
      cause instanceof MeetingRequestError
        ? cause.message
        : 'Não foi possível conectar ao servidor de vídeo. Verifique sua conexão e tente de novo.'
  }
}

async function leave() {
  await lk.leave()
  phase.value = 'left'
}

// quem entrou antes também precisa saber que a gravação começou
watch(lk.recording, async (now, before) => {
  if (phase.value !== 'room' || now === before) return
  if (now) {
    toast.warning('A gravação começou. Todos na sala veem este aviso.')
    return
  }
  // parou sozinha? o servidor guarda o motivo na gravação mais recente (o webhook chega logo depois)
  await new Promise((resolve) => window.setTimeout(resolve, 1500))
  const latest = await listRecordings(meetingId.value)
    .then((rows) => rows[0])
    .catch(() => undefined)
  if (latest?.status === 'failed') toast.error(recordingError(latest.error))
  else toast('A gravação terminou.')
})
watch(lk.state, (state) => {
  if (state === 'disconnected' && phase.value === 'room') phase.value = 'left'
})

async function toggleRecording() {
  if (recordingBusy.value) return
  recordingBusy.value = true
  try {
    if (lk.recording.value) {
      const active = (await listRecordings(meetingId.value)).find((r) =>
        ['starting', 'recording'].includes(r.status),
      )
      if (active) await stopRecording(meetingId.value, active.id)
      toast.success('Gravação encerrada. O vídeo aparece no histórico quando ficar pronto.')
    } else {
      await startRecording(meetingId.value)
      toast('Iniciando a gravação…')
    }
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  } finally {
    recordingBusy.value = false
  }
}

function rejoin() {
  consent.value = false
  phase.value = 'prejoin'
}
</script>

<template>
  <div class="flex h-dvh flex-col bg-bg text-fg">
    <!-- carregando / erro ------------------------------------------------>
    <div v-if="phase === 'loading'" class="grid flex-1 place-items-center p-4">
      <div v-if="loadError" class="grid max-w-md gap-4">
        <UiEmptyState
          :icon="Video"
          title="Não foi possível abrir a reunião"
          :description="loadError"
        >
          <template #action>
            <UiButton :icon="ArrowLeft" @click="router.back()">Voltar</UiButton>
          </template>
        </UiEmptyState>
      </div>
      <div v-else class="grid w-full max-w-md gap-3" aria-label="Carregando reunião">
        <UiSkeleton class="h-8 w-2/3" />
        <UiSkeleton class="h-48 rounded-card" />
      </div>
    </div>

    <!-- pré-entrada --------------------------------------------------------->
    <main
      v-else-if="(phase === 'prejoin' || phase === 'joining') && meeting"
      class="grid flex-1 place-items-center overflow-y-auto p-4"
    >
      <section class="grid w-full max-w-md gap-5 uo-card p-6" aria-labelledby="prejoin-title">
        <header class="grid gap-1">
          <RouterLink
            :to="back"
            class="mb-2 inline-flex w-fit items-center gap-1 rounded-control text-13 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ArrowLeft :size="14" aria-hidden="true" /> Voltar ao projeto
          </RouterLink>
          <h1 id="prejoin-title" class="text-20 font-semibold">{{ meeting.title }}</h1>
          <p class="text-13 text-fg-muted">{{ meetingWhen(meeting) }}</p>
        </header>

        <UiEmptyState
          v-if="!meeting.can_join"
          :icon="Users"
          title="Você não foi convidado"
          description="Peça a quem organizou para incluir você na reunião."
        />
        <template v-else>
          <div class="grid gap-3">
            <UiSwitch
              v-model="wantMic"
              label="Entrar com microfone"
              description="Dá para mudar a qualquer momento."
            />
            <UiSwitch v-model="wantCamera" label="Entrar com câmera" />
          </div>

          <div class="grid gap-3 rounded-card border border-border bg-surface-2 p-4">
            <p class="flex items-center gap-2 text-14 font-medium">
              <Circle :size="12" class="fill-danger text-danger" aria-hidden="true" /> Aviso de
              gravação
            </p>
            <p class="text-13 text-fg-muted">
              Quem organiza pode gravar esta reunião no servidor. Enquanto houver gravação, o aviso
              "Gravando" fica visível para todos. O vídeo fica no histórico do projeto e só quem
              organiza ou gerencia o projeto pode baixar.
            </p>
            <UiCheckbox v-model="consent" label="Entendi e concordo em participar" />
          </div>

          <p v-if="joinError" role="alert" class="text-13 text-danger">{{ joinError }}</p>

          <UiButton
            variant="primary"
            size="lg"
            block
            :loading="phase === 'joining'"
            :disabled="!consent"
            :icon="Video"
            @click="join"
          >
            Entrar na reunião
          </UiButton>
        </template>
      </section>
    </main>

    <!-- sala ---------------------------------------------------------------->
    <template v-else-if="phase === 'room' && meeting">
      <header class="flex min-h-14 flex-wrap items-center gap-3 border-b border-border px-4 py-2">
        <h1 class="min-w-0 flex-1 truncate text-16 font-semibold">{{ meeting.title }}</h1>
        <p v-if="lk.recording.value" role="status" aria-live="polite">
          <UiBadge tone="danger">
            <Circle :size="8" class="fill-current" aria-hidden="true" /> Gravando
          </UiBadge>
        </p>
        <p
          v-if="stateLabel"
          role="status"
          aria-live="polite"
          class="flex items-center gap-2 text-13 text-warning"
        >
          <UiSpinner :size="12" /> {{ stateLabel }}
        </p>
        <span class="text-13 text-fg-muted">
          {{ lk.participants.value.length }}
          {{ lk.participants.value.length === 1 ? 'pessoa' : 'pessoas' }}
        </span>
      </header>

      <div
        v-if="lk.mediaError.value"
        role="alert"
        class="flex items-start gap-2 border-b border-border bg-warning-soft px-4 py-2 text-13 text-fg"
      >
        <span class="flex-1">{{ lk.mediaError.value }}</span>
        <UiIconButton :icon="X" size="sm" label="Fechar aviso" @click="lk.mediaError.value = ''" />
      </div>
      <div
        v-if="lk.audioBlocked.value"
        class="flex items-center gap-3 border-b border-border px-4 py-2 text-13"
      >
        <span class="flex-1">O navegador pausou o som da reunião.</span>
        <UiButton size="sm" :icon="Volume2" @click="lk.enableAudio">Ativar som</UiButton>
      </div>

      <div class="relative flex min-h-0 flex-1">
        <main class="min-w-0 flex-1 overflow-y-auto p-4" aria-label="Participantes em vídeo">
          <div :class="['grid gap-3', gridClass]">
            <ParticipantTile
              v-for="tile in lk.tiles.value"
              :key="tile.key"
              :participant="tile.participant"
              :publication="tile.publication"
              :screen="tile.screen"
              :version="lk.version.value"
            />
          </div>
        </main>

        <aside
          v-if="peopleOpen"
          class="w-72 shrink-0 overflow-y-auto border-l border-border p-4 max-sm:absolute max-sm:inset-0 max-sm:z-10 max-sm:w-auto max-sm:border-l-0 max-sm:bg-bg"
          aria-labelledby="people-title"
        >
          <div class="mb-3 flex items-center justify-between">
            <h2 id="people-title" class="text-14 font-semibold">Na sala</h2>
            <UiIconButton :icon="X" size="sm" label="Fechar lista" @click="peopleOpen = false" />
          </div>
          <ul class="grid gap-2">
            <li
              v-for="person in lk.participants.value"
              :key="person.identity"
              class="flex items-center gap-2 text-13"
            >
              <UiAvatar :name="person.name || person.identity" size="sm" />
              <span class="min-w-0 flex-1 truncate">
                {{ person.name || person.identity }}{{ person.isLocal ? ' (você)' : '' }}
              </span>
              <MicOff
                v-if="!person.isMicrophoneEnabled"
                :size="14"
                class="text-fg-muted"
                aria-label="Microfone desligado"
                role="img"
              />
              <VideoOff
                v-if="!person.isCameraEnabled"
                :size="14"
                class="text-fg-muted"
                aria-label="Câmera desligada"
                role="img"
              />
            </li>
          </ul>
        </aside>
      </div>

      <nav
        class="flex flex-wrap items-center justify-center gap-2 border-t border-border px-4 py-3"
        aria-label="Controles da reunião"
      >
        <UiTooltip :text="lk.local.value.mic ? 'Desligar microfone' : 'Ligar microfone'">
          <UiIconButton
            :icon="lk.local.value.mic ? Mic : MicOff"
            size="lg"
            variant="secondary"
            :pressed="lk.local.value.mic"
            :loading="lk.busy.value === 'mic'"
            :label="lk.local.value.mic ? 'Desligar microfone' : 'Ligar microfone'"
            @click="lk.setMedia('mic', !lk.local.value.mic)"
          />
        </UiTooltip>
        <UiTooltip :text="lk.local.value.camera ? 'Desligar câmera' : 'Ligar câmera'">
          <UiIconButton
            :icon="lk.local.value.camera ? Video : VideoOff"
            size="lg"
            variant="secondary"
            :pressed="lk.local.value.camera"
            :loading="lk.busy.value === 'camera'"
            :label="lk.local.value.camera ? 'Desligar câmera' : 'Ligar câmera'"
            @click="lk.setMedia('camera', !lk.local.value.camera)"
          />
        </UiTooltip>
        <UiTooltip :text="lk.local.value.screen ? 'Parar de compartilhar' : 'Compartilhar tela'">
          <UiIconButton
            :icon="lk.local.value.screen ? MonitorX : MonitorUp"
            size="lg"
            variant="secondary"
            :pressed="lk.local.value.screen"
            :loading="lk.busy.value === 'screen'"
            :label="lk.local.value.screen ? 'Parar de compartilhar a tela' : 'Compartilhar tela'"
            @click="lk.setMedia('screen', !lk.local.value.screen)"
          />
        </UiTooltip>
        <UiTooltip text="Pessoas na sala">
          <UiIconButton
            :icon="Users"
            size="lg"
            variant="secondary"
            :pressed="peopleOpen"
            label="Pessoas na sala"
            @click="peopleOpen = !peopleOpen"
          />
        </UiTooltip>
        <UiButton
          v-if="canRecord"
          size="lg"
          :icon="lk.recording.value ? CircleStop : Circle"
          :loading="recordingBusy"
          @click="toggleRecording"
        >
          {{ lk.recording.value ? 'Parar gravação' : 'Gravar' }}
        </UiButton>
        <UiButton variant="danger" size="lg" :icon="PhoneOff" @click="leave">Sair</UiButton>
      </nav>
    </template>

    <!-- saiu ---------------------------------------------------------------->
    <main v-else-if="phase === 'left'" class="grid flex-1 place-items-center p-4">
      <UiEmptyState
        :icon="PhoneOff"
        title="Você saiu da reunião"
        :description="
          lk.leftReason.value === 'duplicate'
            ? 'Você entrou nesta reunião em outra aba ou aparelho.'
            : lk.leftReason.value
              ? 'A conexão com a sala caiu ou foi encerrada.'
              : 'Até a próxima.'
        "
      >
        <template #action>
          <div class="flex flex-wrap justify-center gap-2">
            <UiButton :icon="ArrowLeft" @click="router.push(back)">Voltar ao projeto</UiButton>
            <UiButton variant="primary" :icon="Video" @click="rejoin">Entrar de novo</UiButton>
          </div>
        </template>
      </UiEmptyState>
    </main>
  </div>
</template>

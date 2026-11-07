<script setup lang="ts">
import {
  ArrowLeft,
  FileDown,
  FileText,
  ListChecks,
  Plus,
  Printer,
  Sparkles,
  Video,
} from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  PageLayout,
  UiBadge,
  UiButton,
  UiEmptyState,
  UiErrorState,
  UiPanel,
  UiSkeleton,
  UiSpinner,
  UiTabs,
} from '@/shared/components'
import type { UUID } from '@/shared/types'
import ActionReviewDialog from '../components/actionReviewDialog.vue'
import InsightSummary from '../components/insightSummary.vue'
import InsightTranscript from '../components/insightTranscript.vue'
import {
  exportInsightMarkdown,
  getInsight,
  getMeeting,
  listRecordings,
  MeetingRequestError,
  processInsight,
} from '../services'
import type { Meeting, MeetingInsight, MeetingRecording } from '../types'
import { clock, formatDuration, INSIGHT_STATUS, insightError } from '../utils'
import { printInsight } from '../utils/print'

/** Gravação com resumo, transcrição pesquisável e ações para virar tarefas. */
const props = defineProps<{ meetingId: UUID; recordingId: UUID }>()

const meeting = ref<Meeting | null>(null)
const recording = ref<MeetingRecording | null>(null)
const insight = ref<MeetingInsight | null>(null)
const loadError = ref('')
const notConfigured = ref(false)
const starting = ref(false)
const tab = ref('summary')
const reviewing = ref(false)
// índice da ação aberta pelo botão "Criar tarefa"; null revisa todas
const reviewOnly = ref<number | null>(null)
function review(index: number | null) {
  reviewOnly.value = index
  reviewing.value = true
}
const current = ref(0)
const video = useTemplateRef<HTMLVideoElement>('video')
let timer: ReturnType<typeof setTimeout> | undefined

const running = computed(
  () => !!insight.value && !['done', 'failed'].includes(insight.value.status),
)
// data e duração, abaixo do título no topo com foto
const subtitle = computed(() => {
  if (!meeting.value || !recording.value) return ''
  const seconds = recording.value.duration_seconds
  return seconds ? `${when.value} · ${formatDuration(seconds)}` : when.value
})
const when = computed(() =>
  recording.value
    ? new Date(recording.value.started_at).toLocaleString('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : '',
)
const pendingActions = computed(
  () => insight.value?.summary?.actions.filter((action) => !action.created).length ?? 0,
)
const tabs = computed(() => [
  { value: 'summary', label: 'Resumo' },
  { value: 'transcript', label: 'Transcrição', count: insight.value?.segments.length },
])

async function loadInsight() {
  clearTimeout(timer)
  try {
    insight.value = await getInsight(props.meetingId, props.recordingId)
    notConfigured.value = false
  } catch (cause) {
    if (cause instanceof MeetingRequestError && cause.code === 'insights_not_configured') {
      notConfigured.value = true
    } else if (!(cause instanceof MeetingRequestError && cause.status === 404)) {
      throw cause
    }
    insight.value = null
  }
  // acompanha o worker enquanto ele trabalha
  if (running.value) timer = setTimeout(() => void loadInsight().catch(() => {}), 5000)
}

async function load() {
  loadError.value = ''
  try {
    const [found, recordings] = await Promise.all([
      getMeeting(props.meetingId),
      listRecordings(props.meetingId),
    ])
    meeting.value = found
    recording.value = recordings.find((row) => row.id === props.recordingId) ?? null
    if (!recording.value) {
      loadError.value = 'Esta gravação não existe mais.'
      return
    }
    await loadInsight()
  } catch (cause) {
    loadError.value = cause instanceof Error ? cause.message : 'Tente novamente.'
  }
}
onMounted(load)
onBeforeUnmount(() => clearTimeout(timer))

async function start() {
  starting.value = true
  try {
    insight.value = await processInsight(props.meetingId, props.recordingId)
    await loadInsight()
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  } finally {
    starting.value = false
  }
}

function seek(seconds: number) {
  const player = video.value
  if (!player) return
  player.currentTime = seconds
  void player.play().catch(() => {})
  player.scrollIntoView({ block: 'nearest' })
}

async function downloadMarkdown() {
  try {
    const blob = await exportInsightMarkdown(props.meetingId, props.recordingId)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${meeting.value?.title ?? 'reuniao'}.md`
    link.click()
    URL.revokeObjectURL(url)
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  }
}

function pdf() {
  if (!meeting.value || !insight.value) return
  if (!printInsight(meeting.value.title, when.value, insight.value)) {
    toast.error('O navegador bloqueou a janela de impressão. Libere pop-ups para este site.')
  }
}
</script>

<template>
  <PageLayout
    :crumbs="['Reuniões', meeting?.title ?? 'Gravação']"
    :title="meeting?.title ?? 'Gravação'"
    :description="subtitle"
    :icon="Video"
    tone="#8b5cf6"
  >
    <RouterLink
      v-if="meeting"
      :to="{
        name: 'SectorBoard',
        params: { sectorId: meeting.sector_id },
        query: { view: 'meetings' },
      }"
      class="flex items-center gap-1.5 self-start rounded-control text-13 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
    >
      <ArrowLeft :size="14" aria-hidden="true" /> Voltar às reuniões
    </RouterLink>

    <div v-if="!meeting && !loadError" class="grid gap-4" aria-label="Carregando">
      <UiSkeleton class="h-10 w-2/3 rounded-control" />
      <UiSkeleton class="aspect-video rounded-card" />
    </div>

    <UiErrorState v-else-if="loadError" :description="loadError" @retry="load" />

    <template v-else-if="meeting && recording">
      <video
        v-if="recording.play_url"
        ref="video"
        :src="recording.play_url"
        controls
        preload="metadata"
        class="aspect-video w-full rounded-card bg-surface-2"
        :aria-label="`Gravação de ${meeting.title}`"
        @timeupdate="current = ($event.target as HTMLVideoElement).currentTime"
      />

      <UiEmptyState
        v-if="notConfigured"
        :icon="Sparkles"
        title="Transcrição não configurada"
        description="Quem administra o Urban Organization liga a transcrição e o resumo no servidor seguindo o docs/IA-REUNIOES.md do backend. Tudo roda no próprio servidor."
      />

      <UiPanel
        v-else-if="!insight"
        title="Transcrição e resumo"
        description="Gerados no próprio servidor, sem enviar o áudio para fora."
      >
        <div class="flex flex-wrap items-center gap-3 p-4">
          <UiButton
            v-if="meeting.can_manage && recording.status === 'ready'"
            variant="primary"
            :icon="Sparkles"
            :loading="starting"
            @click="start"
          >
            Gerar transcrição e resumo
          </UiButton>
          <p v-else class="text-13 text-fg-muted">
            Ainda não há transcrição. Quem organiza a reunião pode gerar.
          </p>
        </div>
      </UiPanel>

      <section
        v-else-if="running"
        class="flex items-center gap-3 uo-card p-4"
        role="status"
        aria-live="polite"
      >
        <UiSpinner :size="16" />
        <div class="grid gap-0.5">
          <p class="text-14 font-medium text-fg">{{ INSIGHT_STATUS[insight.status].label }}</p>
          <p class="text-13 text-fg-muted">
            No servidor, a transcrição pode levar perto da duração da reunião. Esta página atualiza
            sozinha.
          </p>
        </div>
      </section>

      <section v-else-if="insight.status === 'failed'" class="grid gap-3 uo-card p-4">
        <div class="flex flex-wrap items-center gap-2">
          <UiBadge tone="danger">Falhou</UiBadge>
          <span class="text-13 text-fg-muted">
            {{ insight.attempts }} {{ insight.attempts === 1 ? 'tentativa' : 'tentativas' }}. A
            gravação continua guardada.
          </span>
        </div>
        <p role="alert" class="text-13 text-fg">{{ insightError(insight.error) }}</p>
        <UiButton
          v-if="meeting.can_manage"
          class="justify-self-start"
          :loading="starting"
          @click="start"
        >
          Tentar de novo
        </UiButton>
        <p v-if="insight.segments.length" class="text-13 text-fg-muted">
          A transcrição foi salva; a nova tentativa refaz só o resumo.
        </p>
      </section>

      <template v-if="insight && (insight.status === 'done' || insight.segments.length)">
        <div class="flex flex-wrap items-center gap-2">
          <UiButton size="sm" variant="ghost" :icon="FileDown" @click="downloadMarkdown">
            Markdown
          </UiButton>
          <UiButton
            size="sm"
            variant="ghost"
            :icon="Printer"
            title="Abre a impressão do navegador; escolha Salvar como PDF"
            @click="pdf"
          >
            PDF
          </UiButton>
          <span class="flex-1" />
          <UiButton
            v-if="insight.summary?.actions.length"
            size="sm"
            :icon="ListChecks"
            @click="review(null)"
          >
            {{
              pendingActions
                ? `Revisar ${pendingActions} ${pendingActions === 1 ? 'ação' : 'ações'}`
                : 'Ações já viraram tarefas'
            }}
          </UiButton>
        </div>

        <UiTabs v-model="tab" :tabs="tabs" label="Conteúdo da reunião">
          <template #default="{ active }">
            <div class="pt-4">
              <template v-if="active === 'summary'">
                <InsightSummary v-if="insight.summary" :summary="insight.summary" @seek="seek" />
                <UiEmptyState
                  v-else
                  :icon="FileText"
                  title="Sem resumo"
                  :description="
                    insight.error === 'no_speech'
                      ? 'Não encontramos fala nesta gravação.'
                      : 'O resumo ainda não foi gerado.'
                  "
                />
                <section
                  v-if="insight.summary?.actions.length"
                  aria-labelledby="summary-actions"
                  class="mt-6 grid gap-2"
                >
                  <h2 id="summary-actions" class="text-16 font-semibold text-fg">
                    Ações sugeridas
                  </h2>
                  <ul class="grid gap-2">
                    <li
                      v-for="(action, index) in insight.summary.actions"
                      :key="index"
                      class="grid gap-1 rounded-card border border-border p-3 text-14"
                    >
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-medium text-fg">{{ action.title }}</span>
                        <UiBadge v-if="action.created" tone="success">Tarefa criada</UiBadge>
                        <UiButton
                          v-else
                          size="sm"
                          variant="primary"
                          :icon="Plus"
                          class="ml-auto"
                          @click="review(index)"
                        >
                          Criar tarefa
                        </UiButton>
                      </div>
                      <p v-if="action.description" class="text-13 text-fg">
                        {{ action.description }}
                      </p>
                      <p class="text-13 text-fg-muted">
                        {{ action.assignee_name ?? 'Sem responsável identificado' }} ·
                        {{
                          action.due_date
                            ? new Date(`${action.due_date}T12:00`).toLocaleDateString('pt-BR')
                            : 'sem prazo identificado'
                        }}
                      </p>
                      <button
                        type="button"
                        class="cursor-pointer justify-self-start rounded-control text-left text-13 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
                        :aria-label="`Ir para ${clock(action.source.start)} no vídeo`"
                        @click="seek(action.source.start)"
                      >
                        <span class="font-mono tabular-nums">{{ clock(action.source.start) }}</span>
                        “{{ action.source.quote }}”
                      </button>
                    </li>
                  </ul>
                </section>
                <p class="mt-6 text-12 text-fg-muted">
                  Gerado no servidor com {{ insight.transcribe_model }}
                  <template v-if="insight.summary_model"> e {{ insight.summary_model }}</template>
                  em {{ Math.round(insight.transcribe_seconds + insight.summary_seconds) }} s.
                  Confira antes de usar: a IA pode errar.
                </p>
              </template>
              <InsightTranscript
                v-else
                :segments="insight.segments"
                :current="current"
                @seek="seek"
              />
            </div>
          </template>
        </UiTabs>

        <ActionReviewDialog
          v-if="insight.summary"
          v-model:open="reviewing"
          :meeting-id="meetingId"
          :recording-id="recordingId"
          :actions="insight.summary.actions"
          :people="meeting.participants"
          :only="reviewOnly"
          :meeting-title="meeting.title"
          @created="loadInsight"
        />
      </template>
    </template>
  </PageLayout>
</template>

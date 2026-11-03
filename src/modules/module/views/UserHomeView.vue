<script setup lang="ts">
import {
  ArrowRight,
  ArrowRightLeft,
  CalendarClock,
  Check,
  CircleCheck,
  Clock,
  FileAudio,
  FolderKanban,
  ListTodo,
  MessageSquare,
  PencilLine,
  Plus,
  Sparkles,
  Timer,
  Trash2,
  Users,
  Video,
  type LucideIcon,
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { getErrorMessage } from '@/app/plugins/axios'
import {
  TopbarComp,
  UiAvatar,
  UiBadge,
  UiEmptyState,
  UiErrorState,
  UiPanel,
  UiSkeleton,
  UiTabs,
} from '@/shared/components'
import { staggerDelay } from '@/shared/motion'
import { relativeTime } from '@/shared/utils/time'
import { useAuthStore } from '@/modules/auth'
import { InvitationsInbox } from '@/modules/invitations'
import { useOrganizationsStore } from '@/modules/organizations'
import HomeHero from '../components/home/homeHero.vue'
import HomeKpi from '../components/home/homeKpi.vue'
import { shortDate } from '../components/priority'
import ProjectIcon from '../components/projectIcon.vue'
import { getDashboard } from '../services'
import { useSectorsStore } from '../stores'
import type { ActivityAction, Dashboard } from '../types'
import {
  activityText,
  dayLabel,
  dueBadge,
  duration,
  kpis,
  meetingState,
  weekLabel,
} from '../utils/userHome'

const auth = useAuthStore()
const organizations = useOrganizationsStore()
const sectors = useSectorsStore()

const data = ref<Dashboard | null>(null)
const loading = ref(false)
const error = ref('')

async function load() {
  const id = organizations.current?.id
  data.value = null
  error.value = ''
  if (!id) return
  loading.value = true
  try {
    const loaded = await getDashboard(id)
    if (id === organizations.current?.id) data.value = loaded
  } catch (cause) {
    if (id === organizations.current?.id) {
      error.value = getErrorMessage(cause, 'Verifique sua conexão e tente de novo.')
    }
  } finally {
    if (id === organizations.current?.id) loading.value = false
  }
}
// O dashboard é da organização escolhida na barra lateral.
watch(() => organizations.current?.id, load, { immediate: true })

const greeting = computed(() => {
  const hour = new Date().getHours()
  const salute = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = auth.user?.name?.trim().split(/\s+/)[0]
  return firstName ? `${salute}, ${firstName}` : salute
})
const today = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const todayLabel = `${today.charAt(0).toUpperCase()}${today.slice(1)}`
const todayIso = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD no fuso local
const projectsPath = computed(() =>
  organizations.current ? `/organizacoes/${organizations.current.id}/projetos` : '/organizacoes',
)

// ── indicadores ──────────────────────────────────────────────────────────────
const KPI_ICONS: Record<string, LucideIcon> = {
  projects: FolderKanban,
  progress: Timer,
  done: CircleCheck,
  members: Users,
}
const cards = computed(() => (data.value ? kpis(data.value) : []))
const doneTrend = computed(() => data.value?.weekly_done.map((week) => week.done) ?? [])

// ── projetos: os fixados primeiro, com descrição, ícone e progresso reais ────
const projects = computed(() => {
  const lastActivity = new Map<string, string>()
  for (const item of data.value?.recent_activity ?? [])
    if (!lastActivity.has(item.sector_id)) lastActivity.set(item.sector_id, item.created_at)
  return sectors.sectors.slice(0, 5).map((sector) => {
    const total = sector.task_total ?? 0
    const done = sector.task_done ?? 0
    return {
      sector,
      total,
      done,
      percent: total ? Math.round((done * 100) / total) : 0,
      lastActivity: lastActivity.get(sector.id) ?? null,
    }
  })
})
const KPI_COLORS: Record<string, string> = {
  projects: '#f99f11',
  progress: '#f2683c',
  done: '#22b26b',
  members: '#3b82f6',
}

// ── minhas tarefas: abas com listas reais do servidor ──────────────────────────
type TaskTab = 'today' | 'progress' | 'done'
const taskTab = ref<TaskTab>('today')
const taskTabs = computed(() => [
  { value: 'today', label: 'Hoje', count: data.value?.today.length ?? 0 },
  { value: 'progress', label: 'Em andamento', count: data.value?.in_progress ?? 0 },
  { value: 'done', label: 'Concluídas', count: data.value?.done_this_week ?? 0 },
])
const taskRows = computed(() => {
  const d = data.value
  if (!d) return []
  if (taskTab.value === 'today')
    return d.today.map((t) => ({
      ...t,
      done: false,
      badge: dueBadge(t.due_date, t.is_overdue, todayIso),
    }))
  const rows = taskTab.value === 'progress' ? d.my_in_progress : d.my_done
  return rows.map((t) => ({
    ...t,
    done: !!t.completed_at,
    badge: t.completed_at
      ? { label: relativeTime(t.completed_at), tone: 'success' as const }
      : t.due_date
        ? {
            label: t.is_overdue ? 'Atrasada' : shortDate(t.due_date),
            tone: t.is_overdue ? ('danger' as const) : ('neutral' as const),
          }
        : null,
  }))
})
const TASK_EMPTY: Record<TaskTab, string> = {
  today: 'Tarefas atribuídas a você com prazo até amanhã aparecem aqui.',
  progress: 'Tarefas suas em colunas "em andamento" aparecem aqui.',
  done: 'O que você concluir aparece aqui.',
}

// ── gráfico semanal, com o período escolhido sobre os dados reais ────────────
const period = ref('6')
const PERIODS = [
  { value: '4', label: '4 sem.' },
  { value: '6', label: '6 sem.' },
]
const weekly = computed(() => {
  const weeks = (data.value?.weekly_done ?? []).slice(-Number(period.value))
  const max = Math.max(1, ...weeks.map((week) => week.done))
  return weeks.map((week, index) => ({
    label: weekLabel(week.week_start),
    done: week.done,
    ratio: week.done / max,
    current: index === weeks.length - 1,
  }))
})
const weeklyTotal = computed(() => weekly.value.reduce((sum, week) => sum + week.done, 0))
const openBySector = computed(() => {
  const rows = data.value?.open_by_sector ?? []
  const max = Math.max(1, ...rows.map((row) => row.open))
  return rows.slice(0, 6).map((row) => ({ ...row, ratio: row.open / max }))
})

// ── agenda ───────────────────────────────────────────────────────────────────
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const MEETING_STATE = {
  live: { label: 'Agora', tone: 'success' },
  soon: { label: 'Em breve', tone: 'accent' },
  later: { label: '', tone: 'neutral' },
} as const
const AGENDA_COLORS = ['#8b5cf6', '#3b82f6', '#22b26b', '#f2683c']
const minutes = (start: string, end: string) =>
  Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60_000))

// ── atividade ────────────────────────────────────────────────────────────────
const ACTIVITY_ICONS: Record<ActivityAction, LucideIcon> = {
  created: Plus,
  updated: PencilLine,
  moved: ArrowRightLeft,
  commented: MessageSquare,
  deleted: Trash2,
}

const enter = (index: number) => ({ animationDelay: `${staggerDelay(index)}ms` })
</script>

<template>
  <div class="flex min-h-dvh w-full min-w-0 flex-col bg-bg text-fg">
    <TopbarComp :crumbs="['Início']" />

    <HomeHero
      :greeting="greeting"
      :date-label="todayLabel"
      :data="data"
      :projects-to="projectsPath"
    >
      <template #top><InvitationsInbox /></template>

      <!-- indicadores, sobre a foto -->
      <section v-if="!error" aria-label="Indicadores">
        <ul class="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <template v-if="!data">
            <li v-for="n in 4" :key="n">
              <UiSkeleton class="h-[86px] rounded-card opacity-60" />
            </li>
          </template>
          <li v-for="(card, index) in cards" :key="card.key" class="ui-rise" :style="enter(index)">
            <HomeKpi
              :icon="KPI_ICONS[card.key]!"
              :title="card.title"
              :value="card.value"
              :description="card.description"
              :change="card.change"
              :trend="card.key === 'done' ? doneTrend : undefined"
              :color="KPI_COLORS[card.key]!"
            />
          </li>
        </ul>
      </section>
    </HomeHero>

    <main class="home-container flex flex-1 flex-col gap-4 pt-4 pb-10">
      <UiErrorState
        v-if="error"
        title="Não foi possível carregar o início"
        :description="error"
        :retrying="loading"
        @retry="load"
      />

      <template v-else>
        <div class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[1fr_1.15fr_0.85fr]">
          <!-- projetos recentes -->
          <UiPanel
            title="Projetos recentes"
            heading-id="home-projects"
            class="ui-rise"
            :style="enter(4)"
          >
            <template #action>
              <RouterLink :to="projectsPath" class="panel-link ui-link">
                Ver todos <ArrowRight :size="14" aria-hidden="true" />
              </RouterLink>
            </template>
            <div v-if="!sectors.sectors.length && !data" class="flex flex-col gap-2">
              <UiSkeleton v-for="n in 4" :key="n" class="h-14" />
            </div>
            <UiEmptyState
              v-else-if="!projects.length"
              :icon="FolderKanban"
              title="Nenhum projeto ainda"
              description="Crie o primeiro projeto da organização para organizar as tarefas."
            />
            <ul v-else class="-mx-2 flex flex-col">
              <li v-for="project in projects" :key="project.sector.id">
                <RouterLink
                  :to="`/setores/${project.sector.id}`"
                  class="project-row group"
                  :style="{ '--project': project.sector.color || '#f99f11' }"
                >
                  <span class="project-tile" aria-hidden="true">
                    <ProjectIcon :icon="project.sector.icon" color="#ffffff" size="md" />
                  </span>
                  <span class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-14 font-medium text-fg">
                      {{ project.sector.name }}
                    </span>
                    <span class="truncate text-12 text-fg-muted">
                      {{
                        project.sector.description ||
                        (project.lastActivity
                          ? `Atividade ${relativeTime(project.lastActivity)}`
                          : `${project.total} ${project.total === 1 ? 'tarefa' : 'tarefas'}`)
                      }}
                    </span>
                  </span>
                  <span class="flex w-28 shrink-0 items-center gap-2 sm:w-36">
                    <span
                      class="uo-meter flex-1"
                      role="progressbar"
                      :aria-label="`Progresso de ${project.sector.name}`"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      :aria-valuenow="project.percent"
                    >
                      <span :style="{ width: `${project.percent}%` }" />
                    </span>
                    <span class="w-9 text-right font-mono text-12 text-fg">
                      {{ project.percent }}%
                    </span>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </UiPanel>

          <!-- minhas tarefas -->
          <UiPanel title="Minhas tarefas" heading-id="home-mine" class="ui-rise" :style="enter(5)">
            <template #action>
              <RouterLink
                v-if="data?.today[0]"
                :to="`/setores/${data.today[0].sector_id}?view=list`"
                class="panel-link ui-link"
              >
                Ver todas <ArrowRight :size="14" aria-hidden="true" />
              </RouterLink>
            </template>
            <div class="task-tabs" role="tablist" aria-label="Minhas tarefas">
              <button
                v-for="tab in taskTabs"
                :key="tab.value"
                type="button"
                role="tab"
                :aria-selected="taskTab === tab.value"
                class="task-tab"
                @click="taskTab = tab.value as typeof taskTab"
              >
                {{ tab.label }}
                <span class="task-tab-count">{{ tab.count }}</span>
              </button>
            </div>
            <div v-if="!data" class="mt-3 flex flex-col gap-2">
              <UiSkeleton v-for="n in 4" :key="n" class="h-12" />
            </div>
            <UiEmptyState
              v-else-if="!taskRows.length"
              :icon="CircleCheck"
              :title="taskTab === 'done' ? 'Nada concluído ainda' : 'Nada por aqui'"
              :description="TASK_EMPTY[taskTab]"
            />
            <ul v-else :key="taskTab" class="ui-rise -mx-2 mt-2 flex flex-col" role="tabpanel">
              <li v-for="item in taskRows" :key="item.id">
                <RouterLink
                  :to="{ path: `/setores/${item.sector_id}`, query: { task: item.id } }"
                  class="task-row group"
                >
                  <span :class="['task-check', { 'is-done': item.done }]" aria-hidden="true">
                    <Check v-if="item.done" :size="12" :stroke-width="3" />
                  </span>
                  <span class="flex min-w-0 flex-1 flex-col">
                    <span
                      :class="[
                        'truncate text-14',
                        item.done ? 'text-fg-muted line-through' : 'text-fg',
                      ]"
                    >
                      {{ item.title }}
                    </span>
                    <span class="truncate text-12 text-accent/90">{{ item.sector_name }}</span>
                  </span>
                  <UiBadge v-if="item.badge" :tone="item.badge.tone">
                    <Clock :size="12" aria-hidden="true" class="mr-1" />
                    {{ item.badge.label }}
                  </UiBadge>
                  <UiAvatar
                    v-if="auth.user"
                    :name="auth.user.name || auth.user.email"
                    :src="auth.user.avatar_url"
                    size="xs"
                  />
                </RouterLink>
              </li>
            </ul>
          </UiPanel>

          <!-- agenda -->
          <UiPanel
            title="Agenda"
            :description="todayLabel"
            heading-id="home-agenda"
            class="ui-rise lg:col-span-2 2xl:col-span-1"
            :style="enter(6)"
          >
            <template #action>
              <RouterLink to="/calendario" class="panel-link ui-link">
                Ver calendário <ArrowRight :size="14" aria-hidden="true" />
              </RouterLink>
            </template>
            <div v-if="!data" class="flex flex-col gap-2">
              <UiSkeleton v-for="n in 3" :key="n" class="h-14" />
            </div>
            <UiEmptyState
              v-else-if="!data.upcoming_meetings.length"
              :icon="CalendarClock"
              title="Nenhuma reunião marcada"
              description="Reuniões agendadas na aba Reuniões dos projetos aparecem aqui."
            />
            <ol v-else class="flex flex-col gap-2">
              <li
                v-for="(meeting, index) in data.upcoming_meetings"
                :key="meeting.id"
                class="flex gap-3"
              >
                <span class="w-12 shrink-0 pt-2.5 text-right">
                  <span class="block font-mono text-12 text-fg">{{
                    timeOf(meeting.starts_at)
                  }}</span>
                  <span class="block text-[11px] text-fg-muted">{{
                    dayLabel(meeting.starts_at)
                  }}</span>
                </span>
                <RouterLink
                  :to="`/reunioes/${meeting.id}`"
                  :class="[
                    'agenda-item group',
                    `is-${meetingState(meeting.starts_at, meeting.ends_at)}`,
                  ]"
                  :style="{ '--agenda': AGENDA_COLORS[index % AGENDA_COLORS.length] }"
                >
                  <span class="flex min-w-0 flex-1 flex-col">
                    <span class="flex items-center gap-2">
                      <span class="truncate text-13 font-medium text-fg">{{ meeting.title }}</span>
                      <UiBadge
                        v-if="MEETING_STATE[meetingState(meeting.starts_at, meeting.ends_at)].label"
                        :tone="MEETING_STATE[meetingState(meeting.starts_at, meeting.ends_at)].tone"
                        class="shrink-0"
                      >
                        {{ MEETING_STATE[meetingState(meeting.starts_at, meeting.ends_at)].label }}
                      </UiBadge>
                    </span>
                    <span class="truncate text-12 text-fg-muted">
                      {{ meeting.sector_name }} ·
                      {{ minutes(meeting.starts_at, meeting.ends_at) }} min
                    </span>
                  </span>
                  <span v-if="meeting.participant_count" class="flex shrink-0 items-center">
                    <UiAvatar
                      v-for="name in meeting.participants.slice(0, 3)"
                      :key="name"
                      :name="name"
                      size="xs"
                      class="-ml-1 ring-2 ring-surface-2 first:ml-0"
                    />
                    <span v-if="meeting.participant_count > 3" class="ml-1 text-12 text-fg-muted">
                      +{{ meeting.participant_count - 3 }}
                    </span>
                    <span class="sr-only">{{ meeting.participant_count }} participantes</span>
                  </span>
                </RouterLink>
              </li>
            </ol>
          </UiPanel>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <!-- produtividade -->
          <UiPanel
            title="Concluídas pela equipe"
            :description="data ? `${weeklyTotal} no período` : undefined"
            heading-id="home-weekly"
            class="ui-rise lg:col-span-2"
            :style="enter(7)"
          >
            <template #action>
              <UiTabs v-model="period" :tabs="PERIODS" label="Período" />
            </template>
            <UiSkeleton v-if="!data" class="h-48" />
            <UiEmptyState
              v-else-if="!weeklyTotal"
              :icon="CircleCheck"
              title="Nada concluído no período"
              description="Tarefas concluídas pela equipe aparecem aqui, semana a semana."
            />
            <figure v-else class="flex flex-1 flex-col justify-end">
              <ol
                :key="period"
                class="flex h-48 items-end gap-3"
                aria-label="Tarefas concluídas por semana"
              >
                <li
                  v-for="(week, index) in weekly"
                  :key="week.label"
                  class="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                  :aria-label="`Semana de ${week.label}: ${week.done}`"
                >
                  <span
                    class="font-mono text-12 text-fg-muted transition-colors group-hover:text-fg"
                    aria-hidden="true"
                  >
                    {{ week.done }}
                  </span>
                  <span
                    :class="[
                      'ui-grow w-full max-w-12 origin-bottom rounded-t-[6px] transition-[filter] duration-(--dur-fast) group-hover:brightness-125',
                      week.current ? 'uo-bar' : 'uo-bar-muted',
                    ]"
                    :style="{
                      height: `${Math.max(week.ratio * 100, 3)}%`,
                      animationDelay: `${index * 50}ms`,
                    }"
                    :title="`${week.done} concluídas na semana de ${week.label}`"
                    aria-hidden="true"
                  />
                  <span class="text-12 text-fg-muted" aria-hidden="true">{{ week.label }}</span>
                </li>
              </ol>
              <figcaption class="mt-4 flex items-center gap-4 text-12 text-fg-muted">
                <span class="flex items-center gap-1.5">
                  <span class="uo-bar size-2.5 rounded-[3px]" aria-hidden="true" /> Semana atual
                </span>
                <span class="flex items-center gap-1.5">
                  <span
                    class="uo-bar-muted size-2.5 rounded-[3px] border border-border"
                    aria-hidden="true"
                  />
                  Semanas anteriores
                </span>
              </figcaption>
            </figure>
          </UiPanel>

          <!-- abertas por projeto -->
          <UiPanel
            title="Abertas por projeto"
            heading-id="home-open"
            class="ui-rise"
            :style="enter(8)"
          >
            <div v-if="!data" class="flex flex-col gap-3">
              <UiSkeleton v-for="n in 4" :key="n" class="h-6" />
            </div>
            <UiEmptyState
              v-else-if="!openBySector.length"
              title="Nenhuma tarefa aberta"
              description="Quando houver tarefas abertas, a distribuição aparece aqui."
            />
            <ul v-else class="flex flex-col gap-3.5">
              <li v-for="row in openBySector" :key="row.sector" class="flex flex-col gap-1.5">
                <span class="flex items-center justify-between gap-2 text-13">
                  <span class="truncate text-fg">{{ row.sector }}</span>
                  <span class="font-mono text-12 text-fg-muted">{{ row.open }}</span>
                </span>
                <span class="uo-meter" aria-hidden="true">
                  <span :style="{ width: `${row.ratio * 100}%` }" />
                </span>
              </li>
            </ul>
          </UiPanel>
        </div>

        <div class="grid gap-4 lg:grid-cols-5">
          <!-- reuniões e IA -->
          <UiPanel
            title="Reuniões e IA"
            description="Resumos e tarefas sugeridas das gravações"
            heading-id="home-insights"
            class="ui-rise lg:col-span-3"
            :style="enter(9)"
          >
            <div v-if="!data" class="grid gap-3 sm:grid-cols-2">
              <UiSkeleton v-for="n in 2" :key="n" class="h-36" />
            </div>
            <UiEmptyState
              v-else-if="!data.recent_insights.length"
              :icon="Sparkles"
              title="Nenhum resumo ainda"
              description="Grave uma reunião de projeto: a transcrição, o resumo e as tarefas sugeridas aparecem aqui."
            />
            <ul v-else class="grid gap-3 sm:grid-cols-2">
              <li v-for="insight in data.recent_insights" :key="insight.recording_id">
                <RouterLink
                  :to="{
                    name: 'MeetingInsight',
                    params: { meetingId: insight.meeting_id, recordingId: insight.recording_id },
                  }"
                  class="insight-card group"
                >
                  <span class="flex items-center gap-2 text-12 text-fg-muted">
                    <Sparkles :size="14" class="text-accent" aria-hidden="true" />
                    Resumo da IA
                    <span v-if="insight.finished_at" class="ml-auto">
                      {{ relativeTime(insight.finished_at) }}
                    </span>
                  </span>
                  <span class="mt-2 block truncate text-14 font-medium text-fg">
                    {{ insight.meeting_title }}
                  </span>
                  <span class="mt-1 line-clamp-3 text-13 text-fg-muted">
                    {{ insight.excerpt || 'Resumo sem texto executivo.' }}
                  </span>
                  <span
                    class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-12 text-fg-muted"
                  >
                    <span class="inline-flex items-center gap-1">
                      <FileAudio :size="13" aria-hidden="true" />
                      {{ duration(insight.duration_seconds) }}
                    </span>
                    <span
                      v-if="insight.action_count"
                      class="inline-flex items-center gap-1 text-accent"
                    >
                      <ListTodo :size="13" aria-hidden="true" />
                      {{ insight.action_count }}
                      {{ insight.action_count === 1 ? 'tarefa sugerida' : 'tarefas sugeridas' }}
                    </span>
                    <span class="truncate">{{ insight.sector_name }}</span>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </UiPanel>

          <!-- atividade -->
          <UiPanel
            title="Atividade recente"
            heading-id="home-activity"
            class="ui-rise lg:col-span-2"
            :style="enter(10)"
          >
            <div v-if="!data" class="flex flex-col gap-3">
              <UiSkeleton v-for="n in 4" :key="n" class="h-10" />
            </div>
            <UiEmptyState
              v-else-if="!data.recent_activity.length"
              :icon="Video"
              title="Sem atividade ainda"
              description="Criações, movimentações e comentários nos projetos aparecem aqui."
            />
            <ol v-else class="activity flex flex-col">
              <li
                v-for="item in data.recent_activity.slice(0, 6)"
                :key="item.id"
                class="relative flex gap-3 pb-4 last:pb-0"
              >
                <span class="relative flex size-8 shrink-0">
                  <UiAvatar :name="item.actor_name ?? 'Alguém'" size="md" />
                  <span class="activity-icon" aria-hidden="true">
                    <component :is="ACTIVITY_ICONS[item.action]" :size="10" :stroke-width="2.5" />
                  </span>
                </span>
                <p class="min-w-0 flex-1 pt-0.5 text-13 text-fg-muted">
                  <span class="font-medium text-fg">{{ item.actor_name ?? 'Alguém' }}</span>
                  {{ activityText(item).verb }}
                  <RouterLink
                    v-if="item.action !== 'deleted'"
                    :to="{ path: `/setores/${item.sector_id}`, query: { task: item.task_id } }"
                    class="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent"
                    >{{ item.task_title }}</RouterLink
                  >
                  <span v-else class="text-fg">{{ item.task_title }}</span>
                  {{ activityText(item).target }}
                  <span class="mt-0.5 block text-12">
                    {{ item.sector_name }} · {{ relativeTime(item.created_at) }}
                  </span>
                </p>
              </li>
            </ol>
          </UiPanel>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.panel-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 4px;
  font-size: var(--text-12);
  color: var(--ds-accent);
  transition: color var(--dur-fast) var(--ease-out);
}

.panel-link:hover {
  color: var(--ds-accent-hover);
}

.panel-link:focus-visible,
.task-row:focus-visible,
.agenda-item:focus-visible,
.project-row:focus-visible,
.insight-card:focus-visible,
.task-tab:focus-visible {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}

.project-row,
.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 10px;
  padding: 10px 8px;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.project-row:hover,
.task-row:hover {
  background: var(--ds-surface-2);
}

/* bloco sólido com a cor do projeto, como nas referências */
.project-tile {
  display: grid;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--project), #fff 15%), var(--project));
  box-shadow: 0 6px 16px -8px var(--project);
}

.project-tile > span {
  border: 0;
  background: transparent;
}

.task-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
}

.task-tab {
  display: inline-flex;
  height: 30px;
  flex-shrink: 0;
  cursor: pointer;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--ds-border);
  border-radius: 8px;
  background: transparent;
  padding-inline: 10px;
  font-size: var(--text-13);
  color: var(--ds-fg-muted);
  transition:
    color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.task-tab:hover {
  color: var(--ds-fg);
}

.task-tab[aria-selected='true'] {
  border-color: rgb(249 159 17 / 0.4);
  background: var(--ds-accent-soft);
  color: var(--ds-fg);
}

.task-tab-count {
  border-radius: 999px;
  background: var(--ds-surface-3);
  padding: 0 6px;
  font-family: var(--font-mono);
  font-size: var(--text-12);
}

.task-tab[aria-selected='true'] .task-tab-count {
  background: var(--ds-accent);
  color: #000000;
}

.task-check {
  display: grid;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  place-items: center;
  border: 1.5px solid var(--ds-border-strong);
  border-radius: 999px;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.task-row:hover .task-check {
  border-color: var(--ds-accent);
}

.task-check.is-done {
  border-color: var(--ds-success);
  background: var(--ds-success);
  color: #000000;
}

.agenda-item {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--ds-border);
  border-left: 3px solid var(--agenda);
  border-radius: 10px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--agenda) 10%, transparent), transparent 70%),
    var(--ds-surface-2);
  padding: 9px 12px;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.agenda-item:hover {
  transform: translateX(calc(2px * var(--motion-on)));
}

.agenda-item.is-live {
  --agenda: #22b26b !important;
}

.agenda-item.is-soon {
  --agenda: #f99f11 !important;
  background: linear-gradient(90deg, rgb(249 159 17 / 0.16), transparent 80%), var(--ds-surface-2);
}

.insight-card {
  display: flex;
  height: 100%;
  flex-direction: column;
  border: 1px solid var(--ds-border);
  border-radius: 12px;
  background:
    radial-gradient(120% 80% at 100% 0%, rgb(249 159 17 / 0.08), transparent 60%), var(--ds-bg-2);
  padding: 14px;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}

.insight-card:hover {
  border-color: rgb(249 159 17 / 0.35);
  transform: translateY(calc(-2px * var(--motion-on)));
}

/* linha do tempo que liga os avatares da atividade */
.activity > li:not(:last-child)::before {
  position: absolute;
  top: 36px;
  bottom: 4px;
  left: 15px;
  width: 1px;
  content: '';
  background: var(--ds-border);
}

.activity-icon {
  position: absolute;
  right: -3px;
  bottom: -3px;
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border: 2px solid var(--ds-surface-1);
  border-radius: 999px;
  background: var(--ds-accent);
  color: #000000;
}
</style>

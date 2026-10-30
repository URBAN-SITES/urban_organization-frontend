<script setup lang="ts">
import {
  ArrowRight,
  ArrowRightLeft,
  CalendarClock,
  CircleCheck,
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
  PageLayout,
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
  return sectors.sectors.slice(0, 4).map((sector) => {
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
const projectStatus = (percent: number, total: number) =>
  !total
    ? { label: 'Sem tarefas', tone: 'neutral' as const }
    : percent === 100
      ? { label: 'Concluído', tone: 'success' as const }
      : { label: 'Em andamento', tone: 'accent' as const }

// ── minhas tarefas ───────────────────────────────────────────────────────────
const taskGroups = computed(() => {
  const rows = data.value?.today ?? []
  const groups = [
    { key: 'late', title: 'Atrasadas', items: rows.filter((t) => t.is_overdue) },
    {
      key: 'today',
      title: 'Hoje',
      items: rows.filter((t) => !t.is_overdue && t.due_date === todayIso),
    },
    {
      key: 'next',
      title: 'Amanhã',
      items: rows.filter((t) => !t.is_overdue && t.due_date !== todayIso),
    },
  ]
  return groups.filter((group) => group.items.length)
})

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
  <PageLayout :crumbs="['Início']" width="wide">
    <template #top>
      <InvitationsInbox />
      <HomeHero
        :greeting="greeting"
        :date-label="todayLabel"
        :data="data"
        :projects-to="projectsPath"
      />
    </template>

    <UiErrorState
      v-if="error"
      title="Não foi possível carregar o início"
      :description="error"
      :retrying="loading"
      @retry="load"
    />

    <template v-else>
      <!-- indicadores -->
      <section aria-label="Indicadores">
        <ul class="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <template v-if="!data">
            <li v-for="n in 4" :key="n"><UiSkeleton class="h-[132px] rounded-card" /></li>
          </template>
          <li v-for="(card, index) in cards" :key="card.key" class="ui-rise" :style="enter(index)">
            <HomeKpi
              :icon="KPI_ICONS[card.key]!"
              :title="card.title"
              :value="card.value"
              :description="card.description"
              :change="card.change"
              :trend="card.key === 'done' ? doneTrend : undefined"
              :accent="card.key === 'done'"
            />
          </li>
        </ul>
      </section>

      <div class="grid gap-4 lg:grid-cols-5">
        <!-- minhas tarefas -->
        <UiPanel
          title="Minhas tarefas"
          :description="
            data
              ? `${data.in_progress} em andamento · ${data.done_this_week} concluídas nesta semana`
              : 'Atrasadas e com prazo até amanhã'
          "
          heading-id="home-mine"
          class="ui-rise lg:col-span-3"
          :style="enter(4)"
        >
          <div v-if="!data" class="flex flex-col gap-2">
            <UiSkeleton v-for="n in 4" :key="n" class="h-12" />
          </div>
          <UiEmptyState
            v-else-if="!taskGroups.length"
            :icon="CircleCheck"
            title="Nada para hoje"
            description="Tarefas atribuídas a você com prazo até amanhã aparecem aqui."
          />
          <div v-else class="flex flex-col gap-4">
            <section v-for="group in taskGroups" :key="group.key" :aria-label="group.title">
              <h3 class="uo-section-title mb-1.5 flex items-center gap-2">
                <span
                  :class="[
                    'size-1.5 rounded-full',
                    group.key === 'late'
                      ? 'bg-danger'
                      : group.key === 'today'
                        ? 'bg-accent'
                        : 'bg-fg-muted',
                  ]"
                  aria-hidden="true"
                />
                {{ group.title }}
                <span class="font-mono font-normal">{{ group.items.length }}</span>
              </h3>
              <ul class="-mx-2 flex flex-col">
                <li v-for="item in group.items" :key="item.id">
                  <RouterLink
                    :to="{ path: `/setores/${item.sector_id}`, query: { task: item.id } }"
                    class="task-row group"
                  >
                    <ListTodo
                      :size="16"
                      class="shrink-0 text-fg-muted transition-colors group-hover:text-accent"
                      aria-hidden="true"
                    />
                    <span class="flex min-w-0 flex-1 flex-col">
                      <span class="truncate text-14 text-fg">{{ item.title }}</span>
                      <span class="truncate text-12 text-fg-muted">{{ item.sector_name }}</span>
                    </span>
                    <UiBadge :tone="dueBadge(item.due_date, item.is_overdue, todayIso).tone">
                      {{ dueBadge(item.due_date, item.is_overdue, todayIso).label }}
                    </UiBadge>
                    <ArrowRight
                      :size="14"
                      class="shrink-0 text-fg-muted opacity-0 transition-[opacity,transform] duration-(--dur-fast) group-hover:translate-x-0.5 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </RouterLink>
                </li>
              </ul>
            </section>
          </div>
        </UiPanel>

        <!-- agenda -->
        <UiPanel
          title="Agenda"
          description="Próximas reuniões dos seus projetos"
          heading-id="home-agenda"
          class="ui-rise lg:col-span-2"
          :style="enter(5)"
        >
          <template #action>
            <RouterLink to="/calendario" class="panel-link">
              Calendário <ArrowRight :size="14" aria-hidden="true" />
            </RouterLink>
          </template>
          <div v-if="!data" class="flex flex-col gap-2">
            <UiSkeleton v-for="n in 3" :key="n" class="h-16" />
          </div>
          <UiEmptyState
            v-else-if="!data.upcoming_meetings.length"
            :icon="CalendarClock"
            title="Nenhuma reunião marcada"
            description="Reuniões agendadas na aba Reuniões dos projetos aparecem aqui."
          />
          <ol v-else class="flex flex-col gap-2">
            <li v-for="meeting in data.upcoming_meetings" :key="meeting.id">
              <RouterLink
                :to="`/reunioes/${meeting.id}`"
                :class="[
                  'agenda-item group',
                  { 'agenda-live': meetingState(meeting.starts_at, meeting.ends_at) === 'live' },
                ]"
              >
                <span class="agenda-time">
                  <span class="text-12 text-fg-muted">{{ dayLabel(meeting.starts_at) }}</span>
                  <span class="font-mono text-14 text-fg">{{ timeOf(meeting.starts_at) }}</span>
                </span>
                <span class="flex min-w-0 flex-1 flex-col gap-1">
                  <span class="flex items-center gap-2">
                    <span class="truncate text-14 font-medium text-fg">{{ meeting.title }}</span>
                    <UiBadge
                      v-if="MEETING_STATE[meetingState(meeting.starts_at, meeting.ends_at)].label"
                      :tone="MEETING_STATE[meetingState(meeting.starts_at, meeting.ends_at)].tone"
                      class="shrink-0"
                    >
                      {{ MEETING_STATE[meetingState(meeting.starts_at, meeting.ends_at)].label }}
                    </UiBadge>
                  </span>
                  <span class="flex items-center gap-2 text-12 text-fg-muted">
                    <span class="truncate">{{ meeting.sector_name }}</span>
                    <span v-if="meeting.participant_count" class="flex shrink-0 items-center">
                      <UiAvatar
                        v-for="name in meeting.participants.slice(0, 3)"
                        :key="name"
                        :name="name"
                        size="xs"
                        class="-ml-1 ring-2 ring-surface-1 first:ml-0"
                      />
                      <span v-if="meeting.participant_count > 3" class="ml-1">
                        +{{ meeting.participant_count - 3 }}
                      </span>
                      <span class="sr-only">{{ meeting.participant_count }} participantes</span>
                    </span>
                  </span>
                </span>
              </RouterLink>
            </li>
          </ol>
        </UiPanel>
      </div>

      <!-- projetos -->
      <section aria-labelledby="home-projects" class="ui-rise" :style="enter(6)">
        <header class="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="home-projects" class="text-16 font-semibold text-fg">Projetos</h2>
            <p class="text-12 text-fg-muted">Os fixados aparecem primeiro</p>
          </div>
          <RouterLink :to="projectsPath" class="panel-link">
            Ver todos <ArrowRight :size="14" aria-hidden="true" />
          </RouterLink>
        </header>
        <ul
          v-if="!sectors.sectors.length && !data"
          class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <li v-for="n in 4" :key="n"><UiSkeleton class="h-44 rounded-card" /></li>
        </ul>
        <div v-else-if="!projects.length" class="uo-card p-2">
          <UiEmptyState
            :icon="FolderKanban"
            title="Nenhum projeto ainda"
            description="Crie o primeiro projeto da organização para organizar as tarefas."
          />
        </div>
        <ul v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <li
            v-for="(project, index) in projects"
            :key="project.sector.id"
            class="ui-rise"
            :style="enter(index + 6)"
          >
            <RouterLink
              :to="`/setores/${project.sector.id}`"
              class="uo-card uo-card-interactive project-card group"
              :style="{ '--project': project.sector.color || 'var(--ds-accent)' }"
            >
              <span class="flex items-start justify-between gap-3">
                <ProjectIcon :icon="project.sector.icon" :color="project.sector.color" size="md" />
                <UiBadge :tone="projectStatus(project.percent, project.total).tone">
                  {{ projectStatus(project.percent, project.total).label }}
                </UiBadge>
              </span>
              <span class="mt-4 block min-w-0">
                <span class="block truncate text-14 font-semibold text-fg">
                  {{ project.sector.name }}
                </span>
                <span class="mt-1 line-clamp-2 min-h-8 text-12 text-fg-muted">
                  {{ project.sector.description || 'Sem descrição.' }}
                </span>
              </span>
              <span class="mt-4 flex items-center justify-between text-12 text-fg-muted">
                <span>{{ project.done }} de {{ project.total }} tarefas</span>
                <span class="font-mono text-fg">{{ project.percent }}%</span>
              </span>
              <span
                class="uo-meter mt-2"
                role="progressbar"
                :aria-label="`Progresso de ${project.sector.name}`"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="project.percent"
              >
                <span :style="{ width: `${project.percent}%`, '--meter': 'var(--project)' }" />
              </span>
              <span class="mt-3 block truncate text-12 text-fg-muted">
                {{
                  project.lastActivity
                    ? `Atividade ${relativeTime(project.lastActivity)}`
                    : 'Sem atividade recente'
                }}
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <div class="grid gap-4 lg:grid-cols-3">
        <!-- produtividade -->
        <UiPanel
          title="Concluídas pela equipe"
          :description="data ? `${weeklyTotal} no período` : undefined"
          heading-id="home-weekly"
          class="ui-rise lg:col-span-2"
          :style="enter(8)"
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
          :style="enter(9)"
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
          :style="enter(10)"
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
          :style="enter(11)"
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
  </PageLayout>
</template>

<style scoped>
.panel-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 4px;
  font-size: var(--text-12);
  color: var(--ds-fg-muted);
  transition: color var(--dur-fast) var(--ease-out);
}

.panel-link:hover {
  color: var(--ds-accent);
}

.panel-link:focus-visible,
.task-row:focus-visible,
.agenda-item:focus-visible,
.project-card:focus-visible,
.insight-card:focus-visible {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 10px;
  padding: 10px 8px;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.task-row:hover {
  background: var(--ds-surface-2);
}

.agenda-item {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid var(--ds-border);
  border-radius: 12px;
  background: var(--ds-bg-2);
  padding: 10px 12px;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}

.agenda-item:hover {
  border-color: var(--ds-border-strong);
  background: var(--ds-surface-2);
}

.agenda-live {
  border-color: rgb(76 195 138 / 0.35);
}

.agenda-time {
  display: flex;
  width: 64px;
  flex-shrink: 0;
  flex-direction: column;
  border-right: 1px solid var(--ds-border);
  padding-right: 12px;
}

.project-card {
  display: flex;
  height: 100%;
  flex-direction: column;
  padding: 18px;
  overflow: hidden;
}

/* faixa com a cor do projeto no topo, que acende no hover */
.project-card::before {
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  content: '';
  background: linear-gradient(90deg, transparent, var(--project), transparent);
  opacity: 0.5;
  transition: opacity var(--dur-base) var(--ease-out);
}

.project-card:hover::before {
  opacity: 1;
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

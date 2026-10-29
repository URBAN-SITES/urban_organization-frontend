<script setup lang="ts">
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  FolderKanban,
  Star,
  Timer,
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
  UiIcon,
  UiPanel,
  UiProgress,
  UiSkeleton,
} from '@/shared/components'
import { staggerDelay } from '@/shared/motion'
import { relativeTime } from '@/shared/utils/time'
import { useAuthStore } from '@/modules/auth'
import { InvitationsInbox } from '@/modules/invitations'
import { useOrganizationsStore } from '@/modules/organizations'
import { getDashboard } from '../services'
import type { Dashboard } from '../types'
import { activityText, dueBadge, kpis, weekLabel } from '../utils/userHome'

const auth = useAuthStore()
const organizations = useOrganizationsStore()

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

const KPI_ICONS: Record<string, LucideIcon> = {
  projects: FolderKanban,
  progress: Timer,
  done: CircleCheck,
  overdue: CircleAlert,
}
const cards = computed(() => (data.value ? kpis(data.value) : []))

const weekly = computed(() => {
  const weeks = data.value?.weekly_done ?? []
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

const percent = (done: number, total: number) => (total ? Math.round((done * 100) / total) : 0)
</script>

<template>
  <div class="flex min-h-dvh w-full min-w-0 flex-col bg-bg">
    <TopbarComp :crumbs="['Início']" />

    <main class="flex flex-1 flex-col gap-6 px-4 pt-6 pb-10 sm:px-8 xl:px-10">
      <InvitationsInbox />

      <header>
        <h1 class="text-32 leading-tight font-semibold tracking-[-0.02em] text-fg">
          {{ greeting }}
        </h1>
        <p class="mt-1 text-14 text-fg-muted">
          {{ todayLabel }}
          <template v-if="data">
            · {{ data.open_tasks }}
            {{ data.open_tasks === 1 ? 'tarefa aberta' : 'tarefas abertas' }}
            com você
          </template>
        </p>
      </header>

      <UiErrorState
        v-if="error"
        title="Não foi possível carregar o início"
        :description="error"
        :retrying="loading"
        @retry="load"
      />

      <template v-else>
        <!-- números da semana -->
        <ul class="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Resumo">
          <template v-if="!data">
            <li v-for="n in 4" :key="n">
              <UiSkeleton class="h-24 rounded-card" />
            </li>
          </template>
          <li
            v-for="(card, index) in cards"
            :key="card.key"
            class="ui-rise flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface-1 p-4"
            :style="{ animationDelay: `${staggerDelay(index)}ms` }"
          >
            <span class="flex items-center gap-2 text-13 text-fg-muted">
              <UiIcon
                :icon="KPI_ICONS[card.key]!"
                :class="card.key === 'overdue' && card.value ? 'text-danger' : ''"
              />
              {{ card.title }}
            </span>
            <span class="font-mono text-32 leading-none text-fg">{{ card.value }}</span>
            <span class="truncate text-12 text-fg-muted">{{ card.description }}</span>
          </li>
        </ul>

        <div class="grid gap-4 lg:grid-cols-3">
          <!-- minhas tarefas -->
          <UiPanel
            title="Minhas tarefas"
            description="Atrasadas e com prazo até amanhã"
            heading-id="home-mine"
            class="lg:col-span-2"
          >
            <div v-if="!data" class="flex flex-col gap-2">
              <UiSkeleton v-for="n in 4" :key="n" class="h-11" />
            </div>
            <UiEmptyState
              v-else-if="!data.today.length"
              :icon="CircleCheck"
              title="Nada para hoje"
              description="Tarefas atribuídas a você com prazo até amanhã aparecem aqui."
            />
            <ul v-else class="-mx-2 flex flex-col">
              <li v-for="item in data.today" :key="item.id">
                <RouterLink
                  :to="{ path: `/setores/${item.sector_id}`, query: { task: item.id } }"
                  class="flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors duration-(--dur-fast) ease-out hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-14 text-fg">{{ item.title }}</span>
                    <span class="truncate text-12 text-fg-muted">{{ item.sector_name }}</span>
                  </span>
                  <UiBadge :tone="dueBadge(item.due_date, item.is_overdue, todayIso).tone">
                    {{ dueBadge(item.due_date, item.is_overdue, todayIso).label }}
                  </UiBadge>
                </RouterLink>
              </li>
            </ul>
          </UiPanel>

          <!-- projetos fixados -->
          <UiPanel title="Projetos fixados" heading-id="home-favorites">
            <template #action>
              <RouterLink
                v-if="organizations.current"
                :to="{
                  name: 'OrganizationSectors',
                  params: { organizationId: organizations.current.id },
                }"
                class="inline-flex items-center gap-1 rounded-[4px] text-12 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
              >
                Ver todos <ArrowRight :size="14" aria-hidden="true" />
              </RouterLink>
            </template>
            <div v-if="!data" class="flex flex-col gap-2">
              <UiSkeleton v-for="n in 3" :key="n" class="h-12" />
            </div>
            <UiEmptyState
              v-else-if="!data.favorites.length"
              :icon="Star"
              title="Nenhum projeto fixado"
              description="Marque a estrela de um projeto para acompanhá-lo daqui."
            />
            <ul v-else class="-mx-2 flex flex-col">
              <li v-for="project in data.favorites" :key="project.id">
                <RouterLink
                  :to="`/setores/${project.id}`"
                  class="flex flex-col gap-2 rounded-control px-2 py-2.5 transition-colors duration-(--dur-fast) ease-out hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span class="flex items-center gap-2">
                    <span
                      class="size-2 shrink-0 rounded-full bg-fg-muted"
                      :style="project.color ? { backgroundColor: project.color } : undefined"
                      aria-hidden="true"
                    />
                    <span class="min-w-0 flex-1 truncate text-14 text-fg">{{ project.name }}</span>
                    <span class="font-mono text-12 text-fg-muted">
                      {{ percent(project.task_done, project.task_total) }}%
                    </span>
                  </span>
                  <UiProgress
                    :value="project.task_done"
                    :max="project.task_total || 1"
                    :label="`Progresso de ${project.name}`"
                    tone="neutral"
                  />
                </RouterLink>
              </li>
            </ul>
          </UiPanel>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <!-- atividade -->
          <UiPanel title="Atividade recente" heading-id="home-activity">
            <div v-if="!data" class="flex flex-col gap-3">
              <UiSkeleton v-for="n in 4" :key="n" class="h-9" />
            </div>
            <UiEmptyState
              v-else-if="!data.recent_activity.length"
              title="Sem atividade ainda"
              description="Criações, movimentações e comentários nos projetos aparecem aqui."
            />
            <ol v-else class="flex flex-col gap-3">
              <li
                v-for="item in data.recent_activity.slice(0, 6)"
                :key="item.id"
                class="flex gap-2.5"
              >
                <UiAvatar :name="item.actor_name ?? 'Alguém'" size="sm" class="mt-0.5" />
                <p class="min-w-0 flex-1 text-13 text-fg-muted">
                  <span class="font-medium text-fg">{{ item.actor_name ?? 'Alguém' }}</span>
                  {{ activityText(item).verb }}
                  <RouterLink
                    v-if="item.action !== 'deleted'"
                    :to="{ path: `/setores/${item.sector_id}`, query: { task: item.task_id } }"
                    class="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg"
                    >{{ item.task_title }}</RouterLink
                  >
                  <span v-else class="text-fg">{{ item.task_title }}</span>
                  {{ activityText(item).target }}
                  <span class="block text-12">
                    {{ item.sector_name }} · {{ relativeTime(item.created_at) }}
                  </span>
                </p>
              </li>
            </ol>
          </UiPanel>

          <!-- concluídas por semana -->
          <UiPanel
            title="Concluídas pela equipe"
            :description="data ? `${weeklyTotal} nas últimas 6 semanas` : undefined"
            heading-id="home-weekly"
          >
            <UiSkeleton v-if="!data" class="h-40" />
            <figure v-else class="flex flex-1 flex-col justify-end">
              <ol class="flex h-40 items-end gap-2" aria-label="Tarefas concluídas por semana">
                <li
                  v-for="week in weekly"
                  :key="week.label"
                  class="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  :aria-label="`Semana de ${week.label}: ${week.done}`"
                >
                  <span class="font-mono text-12 text-fg-muted" aria-hidden="true">
                    {{ week.done }}
                  </span>
                  <span
                    class="ui-grow w-full max-w-10 origin-bottom rounded-t-[4px]"
                    :class="week.current ? 'bg-accent' : 'bg-surface-3'"
                    :style="{ height: `${Math.max(week.ratio * 100, 2)}%` }"
                    aria-hidden="true"
                  />
                  <span class="text-12 text-fg-muted" aria-hidden="true">{{ week.label }}</span>
                </li>
              </ol>
            </figure>
          </UiPanel>

          <!-- abertas por projeto -->
          <UiPanel title="Abertas por projeto" heading-id="home-open">
            <div v-if="!data" class="flex flex-col gap-3">
              <UiSkeleton v-for="n in 4" :key="n" class="h-6" />
            </div>
            <UiEmptyState
              v-else-if="!openBySector.length"
              title="Nenhuma tarefa aberta"
              description="Quando houver tarefas abertas, a distribuição aparece aqui."
            />
            <ul v-else class="flex flex-col gap-3">
              <li v-for="row in openBySector" :key="row.sector" class="flex flex-col gap-1.5">
                <span class="flex items-center justify-between gap-2 text-13">
                  <span class="truncate text-fg">{{ row.sector }}</span>
                  <span class="font-mono text-12 text-fg-muted">{{ row.open }}</span>
                </span>
                <span class="block h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <span
                    class="ui-grow-x block h-full origin-left rounded-full bg-fg-muted"
                    :style="{ width: `${row.ratio * 100}%` }"
                  />
                </span>
              </li>
            </ul>
          </UiPanel>
        </div>
      </template>
    </main>
  </div>
</template>

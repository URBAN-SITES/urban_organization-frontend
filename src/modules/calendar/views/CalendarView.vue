<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { CalendarCheck, CalendarDays, Check, ChevronLeft, ChevronRight } from '@lucide/vue'
import { PageLayout, UiButton, UiIconButton } from '@/shared/components'
import { ensureGoogleConnected, useGoogleStore } from '@/modules/calendar_sync'
import { useOrganizationsStore } from '@/modules/organizations'
import { listCalendar } from '../services'
import type { CalendarItem, CalendarState } from '../types'
import {
  groupByDate,
  gridRange,
  monthGrid,
  monthTitle,
  shiftMonth,
  stateLabels,
  todayIso,
} from '../utils'

const MAX_CHIPS = 3
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const DOT: Record<CalendarState, string> = {
  done: 'bg-success',
  late: 'bg-danger',
  in_progress: 'bg-accent',
  todo: 'bg-fg-muted',
}
const CHIP: Record<CalendarState, string> = {
  done: 'bg-success-soft text-success',
  late: 'bg-danger-soft text-danger',
  in_progress: 'bg-accent-soft text-accent',
  todo: 'bg-surface-2 text-fg-muted',
}

const organizations = useOrganizationsStore()
const router = useRouter()
const google = useGoogleStore()

const today = todayIso()
const [initialYear, initialMonth] = [Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1]
const view = ref({ year: initialYear, month: initialMonth })
const items = ref<CalendarItem[]>([])
const loading = ref(false)

const weeks = computed(() => monthGrid(view.value.year, view.value.month))
const byDate = computed(() => groupByDate(items.value))
// agenda do celular: só o mês aberto, em ordem de data
const agenda = computed(() => {
  const prefix = `${view.value.year}-${String(view.value.month + 1).padStart(2, '0')}`
  return items.value.filter((item) => item.due_date.startsWith(prefix))
})
const agendaDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
const title = computed(() => monthTitle(view.value.year, view.value.month))

let request = 0
async function load() {
  const organization = organizations.current
  const current = ++request
  items.value = []
  if (!organization) return
  loading.value = true
  try {
    const { start, end } = gridRange(weeks.value)
    const loaded = await listCalendar(organization.id, start, end)
    if (current === request) items.value = loaded
  } catch (error) {
    if (current === request)
      toast.error(getErrorMessage(error, 'Não foi possível carregar o calendário.'))
  } finally {
    if (current === request) loading.value = false
  }
}

watch([() => organizations.current?.id, view], load, { immediate: true })
onMounted(() => void google.loadStatus())

const go = (delta: number) => (view.value = shiftMonth(view.value.year, view.value.month, delta))
const goToday = () => (view.value = { year: initialYear, month: initialMonth })

async function connectGoogle() {
  try {
    await ensureGoogleConnected({ returnTo: '/calendario' })
  } catch (error) {
    toast.error(getErrorMessage(error, 'Não foi possível conectar o Google Agenda.'))
  }
}

const openItem = (item: CalendarItem) =>
  router.push({
    name: 'SectorBoard',
    params: { sectorId: item.sector_id },
    query: { task: item.id },
  })
// tarefas que já estão no Google Agenda ganham anel azul e o ícone de agenda
const GOOGLE_RING = 'ring-1 ring-border-strong'

const dayLabel = (date: string, count: number) =>
  `${new Date(`${date}T00:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' })}: ${
    count ? `${count} ${count === 1 ? 'entrega' : 'entregas'}` : 'sem entregas'
  }`
</script>

<template>
  <PageLayout :crumbs="['Calendário']" width="wide">
    <template #title>
      <span class="flex items-center gap-1">
        <span aria-live="polite">{{ title }}</span>
        <UiIconButton :icon="ChevronLeft" label="Mês anterior" class="ml-2" @click="go(-1)" />
        <UiIconButton :icon="ChevronRight" label="Próximo mês" @click="go(1)" />
      </span>
    </template>
    <template #description>Entregas de todos os setores que você acompanha</template>
    <template #actions>
      <UiButton @click="goToday">Hoje</UiButton>
      <UiButton v-if="google.status.connected" :icon="Check" disabled>
        Google Agenda conectada
      </UiButton>
      <UiButton v-else :icon="CalendarDays" @click="connectGoogle">Conectar Google Agenda</UiButton>
    </template>

    <div class="rounded-card border border-border bg-surface-1 p-3 sm:p-4" :aria-busy="loading">
      <div class="grid grid-cols-7 gap-1.5 pb-2 text-12 text-fg-muted" aria-hidden="true">
        <span v-for="weekday in WEEKDAYS" :key="weekday" class="px-1.5">{{ weekday }}</span>
      </div>

      <div class="grid gap-1.5">
        <div v-for="(week, w) in weeks" :key="w" class="grid grid-cols-7 gap-1.5">
          <div
            v-for="day in week"
            :key="day.date"
            role="group"
            :aria-label="dayLabel(day.date, byDate.get(day.date)?.length ?? 0)"
            :class="[
              'flex min-h-21 min-w-0 flex-col gap-1 rounded-control border p-1.5 sm:min-h-30',
              day.date === today
                ? 'border-border-strong bg-surface-1'
                : day.inMonth
                  ? 'border-border bg-surface-1'
                  : 'border-border bg-bg',
            ]"
          >
            <span
              :class="[
                'text-13 leading-none tabular-nums',
                day.date === today
                  ? 'grid size-6 place-items-center rounded-full bg-fg font-semibold text-bg'
                  : day.inMonth
                    ? 'text-fg'
                    : 'text-fg-muted',
              ]"
              >{{ day.day }}</span
            >
            <div
              v-if="byDate.get(day.date)"
              class="flex flex-wrap gap-0.5 sm:hidden"
              aria-hidden="true"
            >
              <span
                v-for="item in byDate.get(day.date)!.slice(0, MAX_CHIPS)"
                :key="item.id"
                :class="['size-1.5 rounded-full', DOT[item.state]]"
              />
            </div>
            <ul v-if="byDate.get(day.date)" class="hidden min-w-0 flex-col gap-0.5 sm:flex">
              <li v-for="item in byDate.get(day.date)!.slice(0, MAX_CHIPS)" :key="item.id">
                <button
                  type="button"
                  :class="[
                    'flex w-full cursor-pointer items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-left text-12 leading-4 transition-[filter] duration-(--dur-fast) ease-out hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
                    CHIP[item.state],
                    item.in_google && GOOGLE_RING,
                  ]"
                  :title="`${item.title} · ${item.sector_name} · ${stateLabels[item.state]}${item.assignee_name ? ` · ${item.assignee_name}` : ''}${item.in_google ? ' · no Google Agenda' : ''}`"
                  @click="openItem(item)"
                >
                  <CalendarCheck
                    v-if="item.in_google"
                    :size="12"
                    class="shrink-0"
                    aria-label="No Google Agenda"
                  />
                  <span class="truncate">{{ item.title }}</span>
                </button>
              </li>
              <li
                v-if="byDate.get(day.date)!.length > MAX_CHIPS"
                class="px-1.5 text-12 text-fg-muted"
              >
                +{{ byDate.get(day.date)!.length - MAX_CHIPS }} mais
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <section v-if="agenda.length" class="sm:hidden" aria-label="Entregas do mês">
      <h2 class="pb-2 text-14 font-semibold text-fg">Neste mês</h2>
      <ul class="rounded-card border border-border bg-surface-1 px-3.5">
        <li
          v-for="item in agenda"
          :key="item.id"
          class="flex cursor-pointer items-center gap-2.5 border-b border-border py-3 last:border-b-0 hover:text-fg"
          @click="openItem(item)"
        >
          <span :class="['size-2 shrink-0 rounded-full', DOT[item.state]]" aria-hidden="true" />
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="flex min-w-0 items-center gap-1 text-14 font-medium">
              <CalendarCheck
                v-if="item.in_google"
                :size="14"
                class="shrink-0 text-fg-muted"
                aria-label="No Google Agenda"
              />
              <span class="truncate">{{ item.title }}</span>
            </span>
            <span class="truncate text-12 text-fg-muted"
              >{{ agendaDate(item.due_date) }} · {{ item.sector_name }}</span
            >
          </span>
          <span :class="['shrink-0 rounded-[4px] px-1.5 py-0.5 text-12', CHIP[item.state]]">{{
            stateLabels[item.state]
          }}</span>
        </li>
      </ul>
    </section>

    <p v-if="!loading && !items.length" class="text-13 text-fg-muted">
      Nenhuma entrega com data neste período. Tarefas com prazo aparecem aqui.
    </p>
  </PageLayout>
</template>

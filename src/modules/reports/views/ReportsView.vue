<script setup lang="ts">
import { ChartColumn } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { BaseButton, CardComp, ChartComp, PageLayout } from '@/shared/components'
import { avatar } from '@/shared/utils/people'
import { categoryColors, inkWithAccent } from '@/shared/utils/chartColors'
import { useOrganizationsStore } from '@/modules/organizations'
import { downloadReportPdf, getReport } from '../services'
import type { Report, ReportDays } from '../types'
import { kpis, peopleCsv, periods } from '../utils'
import { BADGE, BADGE_BASE, TOOLBAR_BUTTON } from '../utils/ui'

const organizations = useOrganizationsStore()

const days = ref<ReportDays>(30)
const report = ref<Report | null>(null)
const loading = ref(false)

let request = 0
async function load() {
  const organization = organizations.current
  const current = ++request
  report.value = null
  if (!organization) return
  loading.value = true
  try {
    const loaded = await getReport(organization.id, days.value)
    if (current === request) report.value = loaded
  } catch (error) {
    if (current === request)
      toast.error(getErrorMessage(error, 'Não foi possível carregar os relatórios.'))
  } finally {
    if (current === request) loading.value = false
  }
}
watch([() => organizations.current?.id, days], load, { immediate: true })

const cards = computed(() => (report.value ? kpis(report.value) : []))
const weeks = computed(() => report.value?.weekly_done ?? [])

const weeklyData = computed(() => ({
  labels: weeks.value.map((w) => `${w.week_start.slice(8)}/${w.week_start.slice(5, 7)}`),
  datasets: [
    {
      label: 'Tarefas concluídas',
      data: weeks.value.map((w) => w.done),
      backgroundColor: inkWithAccent(weeks.value.length),
    },
  ],
}))
const weeklyTotal = computed(() => weeks.value.reduce((sum, w) => sum + w.done, 0))

const lateData = computed(() => {
  const sectors = report.value?.overdue_by_sector ?? []
  return {
    labels: sectors.map((s) => s.sector),
    datasets: [
      {
        label: 'Tarefas atrasadas',
        data: sectors.map((s) => s.overdue),
        backgroundColor: categoryColors(sectors.length),
      },
    ],
  }
})

const COLUMNS = ['Pessoa', 'Concluídas', 'No prazo', 'Abertas', 'Atrasadas']
const onTimeTone = (pct: number) =>
  pct >= 85 ? BADGE.success : pct >= 70 ? BADGE.warning : BADGE.danger

function exportCsv() {
  if (!report.value?.people.length) return toast.info('Não há pessoas com tarefas para exportar.')
  const blob = new Blob([peopleCsv(report.value.people)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: 'desempenho.csv' }).click()
  URL.revokeObjectURL(url)
}

const exportingPdf = ref(false)
async function exportPdf() {
  const organization = organizations.current
  if (!organization || exportingPdf.value) return
  exportingPdf.value = true
  try {
    const blob = await downloadReportPdf(organization.id, days.value)
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), {
      href: url,
      download: `relatorio-${days.value}-dias.pdf`,
    }).click()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.error(getErrorMessage(error, 'Não foi possível gerar o PDF.'))
  } finally {
    exportingPdf.value = false
  }
}
</script>

<template>
  <PageLayout
    :icon="ChartColumn"
    tone="#3b82f6"
    :crumbs="['Relatórios']"
    title="Relatórios"
    :description="`${periods.find((p) => p.days === days)!.label} · setores que você acompanha`"
    width="wide"
  >
    <template #actions>
      <div class="flex flex-wrap gap-[8px]">
        <label
          :class="[
            TOOLBAR_BUTTON,
            'inline-flex cursor-pointer items-center gap-[8px] border border-border bg-surface-1',
          ]"
        >
          <span class="material-symbols-outlined" aria-hidden="true">calendar_today</span>
          <span class="sr-only">Período</span>
          <select v-model="days" class="cursor-pointer bg-transparent outline-none">
            <option v-for="period in periods" :key="period.days" :value="period.days">
              {{ period.label }}
            </option>
          </select>
        </label>
        <BaseButton
          variant="secondary"
          label="Exportar CSV"
          icon="download"
          icon-position="left"
          :full-width="false"
          :class="TOOLBAR_BUTTON"
          @click="exportCsv"
        />
        <BaseButton
          variant="secondary"
          label="Baixar PDF"
          icon="picture_as_pdf"
          icon-position="left"
          :full-width="false"
          :loading="exportingPdf"
          :class="TOOLBAR_BUTTON"
          @click="exportPdf"
        />
      </div>
    </template>

    <div class="grid grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-4">
      <CardComp
        v-for="kpi in cards"
        :key="kpi.title"
        :title="kpi.title"
        :data="kpi.data"
        :description="kpi.description"
        :tone="kpi.tone"
      />
    </div>

    <div class="grid gap-[16px] lg:grid-cols-2">
      <ChartComp
        title="Concluídas por semana"
        :chart-data="weeklyData"
        :headline="String(weeklyTotal)"
        note="em 6 semanas"
      />
      <ChartComp
        title="Atrasos por setor"
        :chart-data="lateData"
        empty="Nenhuma tarefa atrasada. Bom trabalho!"
      />
    </div>

    <section class="overflow-hidden uo-card">
      <h2 class="px-[18px] pt-[16px] pb-[12px] text-16 font-semibold text-fg">
        Desempenho por pessoa
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[620px] border-collapse text-left">
          <thead>
            <tr class="border-y border-border bg-surface-2 dark:bg-black/20">
              <th
                v-for="column in COLUMNS"
                :key="column"
                scope="col"
                class="px-[18px] py-[9px] text-[12px] leading-normal font-normal text-fg-muted"
              >
                {{ column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="person in report?.people ?? []"
              :key="person.user_id"
              class="border-b border-border text-[13px] leading-normal last:border-b-0"
            >
              <td class="px-[18px] py-[12px]">
                <span class="flex items-center gap-[8px] font-medium">
                  <span
                    class="grid size-[24px] shrink-0 place-items-center rounded-full text-[9px] leading-none font-semibold text-white"
                    :style="{ backgroundColor: avatar(person.name).color }"
                    aria-hidden="true"
                    >{{ avatar(person.name).initials }}</span
                  >
                  {{ person.name }}
                </span>
              </td>
              <td class="px-[18px] py-[12px]">{{ person.completed }}</td>
              <td class="px-[18px] py-[12px]">
                <span
                  v-if="person.on_time_pct !== null"
                  :class="[BADGE_BASE, onTimeTone(person.on_time_pct)]"
                  >{{ person.on_time_pct }}%</span
                >
                <span v-else class="text-fg-muted">—</span>
              </td>
              <td class="px-[18px] py-[12px]">{{ person.open }}</td>
              <td
                :class="[
                  'px-[18px] py-[12px]',
                  person.overdue ? 'font-medium text-(--destructive)' : '',
                ]"
              >
                {{ person.overdue }}
              </td>
            </tr>
            <tr v-if="!report?.people.length">
              <td
                :colspan="COLUMNS.length"
                class="px-[18px] py-[28px] text-center text-[13px] text-fg-muted"
              >
                {{
                  loading
                    ? 'Carregando relatórios…'
                    : 'Ninguém com tarefas atribuídas ainda. Atribua tarefas para ver o desempenho.'
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </PageLayout>
</template>

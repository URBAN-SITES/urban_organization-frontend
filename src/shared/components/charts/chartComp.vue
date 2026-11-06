<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import type { ChartData } from 'chart.js'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

defineProps<{
  chartData: ChartData<'bar'>
  title: string
  /** Número em destaque abaixo do título, como "47". */
  headline?: string
  /** Texto pequeno ao lado do destaque, como "+12%". */
  note?: string
  /** Mensagem no lugar do gráfico quando não há barras. */
  empty?: string
}>()

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  datasets: { bar: { borderRadius: 6, maxBarThickness: 88 } },
  scales: {
    // contagens são inteiras: sem eixo, o valor aparece ao passar o mouse
    y: { display: false, beginAtZero: true, ticks: { precision: 0 }, grid: { display: false } },
    x: { grid: { display: false }, border: { display: false } },
  },
}
</script>

<template>
  <div class="group relative grid min-w-0 w-full gap-2 overflow-hidden uo-card px-[18px] py-[16px]">
    <h3 class="text-[15px] font-semibold">{{ title }}</h3>
    <p v-if="headline" class="flex items-baseline gap-2">
      <span class="text-[28px] leading-none font-semibold tracking-[-0.02em]">{{ headline }}</span>
      <span v-if="note" class="text-[13px] text-fg-muted">{{ note }}</span>
    </p>

    <p v-if="empty && !chartData.labels?.length" class="py-[24px] text-[13px] text-fg-muted">
      {{ empty }}
    </p>
    <div v-else class="relative h-[200px] min-w-0">
      <Bar :data="chartData" :options="chartOptions" :aria-label="`Gráfico: ${title}`" />
    </div>
  </div>
</template>

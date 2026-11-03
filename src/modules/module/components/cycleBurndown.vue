<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { UiSpinner } from '@/shared/components'
import { getBurndown } from '../services'
import type { Burndown } from '../types'
import { diffDays } from '../utils/timeline'
import { shortDate } from './priority'

/** Burndown do ciclo: o que ainda faltava no fim de cada dia, contra o ritmo ideal. */
const props = defineProps<{ cycleId: string }>()

const data = ref<Burndown | null>(null)
const failed = ref(false)
const unit = ref<'tasks' | 'points'>('tasks')
const hover = ref<number | null>(null)

watch(
  () => props.cycleId,
  async (id) => {
    data.value = null
    failed.value = false
    try {
      const result = await getBurndown(id)
      if (id === props.cycleId) data.value = result
    } catch {
      failed.value = true
    }
  },
  { immediate: true },
)

const W = 560
const H = 220
const PAD = { top: 12, right: 12, bottom: 28, left: 32 }
const plotW = W - PAD.left - PAD.right
const plotH = H - PAD.top - PAD.bottom

const span = computed(() => (data.value ? diffDays(data.value.start_date, data.value.end_date) : 1))
const total = computed(() =>
  data.value ? (unit.value === 'points' ? data.value.total_points : data.value.total) : 0,
)
const values = computed(() =>
  (data.value?.days ?? []).map((day) =>
    unit.value === 'points' ? day.remaining_points : day.remaining,
  ),
)
const yMax = computed(() => Math.max(1, total.value, ...values.value))
const x = (index: number) => PAD.left + (span.value ? (index / span.value) * plotW : 0)
const y = (value: number) => PAD.top + plotH - (value / yMax.value) * plotH

const actualPath = computed(() =>
  values.value.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' '),
)
const ticks = computed(() => {
  const step = Math.max(1, Math.ceil(yMax.value / 4))
  const out: number[] = []
  for (let v = 0; v <= yMax.value; v += step) out.push(v)
  return out
})
const dayLabels = computed(() => {
  if (!data.value) return []
  const every = Math.max(1, Math.ceil(span.value / 6))
  const labels: { index: number; text: string }[] = []
  for (let i = 0; i <= span.value; i += every) {
    const date = new Date(`${data.value.start_date}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + i)
    labels.push({ index: i, text: shortDate(date.toISOString().slice(0, 10)) })
  }
  return labels
})
const ideal = (index: number) =>
  span.value ? Math.max(0, total.value - (total.value * index) / span.value) : 0

function onMove(event: PointerEvent) {
  const box = (event.currentTarget as SVGElement).getBoundingClientRect()
  const px = ((event.clientX - box.left) / box.width) * W
  const index = Math.round(((px - PAD.left) / plotW) * span.value)
  hover.value = index >= 0 && index < values.value.length ? index : null
}
</script>

<template>
  <div class="grid gap-3">
    <p v-if="failed" class="text-13 text-danger">Não foi possível carregar o gráfico.</p>
    <p v-else-if="!data" class="flex items-center gap-2 text-13 text-fg-muted">
      <UiSpinner :size="14" /> Carregando…
    </p>
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <ul class="flex flex-wrap gap-4 text-12 text-fg-muted" aria-label="Legenda">
          <li class="flex items-center gap-2">
            <span class="h-0.5 w-4 rounded bg-accent" aria-hidden="true" />Faltando
          </li>
          <li class="flex items-center gap-2">
            <span class="w-4 border-t-2 border-dashed border-fg-muted" aria-hidden="true" />Ritmo
            ideal
          </li>
        </ul>
        <div v-if="data.total_points" class="tl-zoom" role="radiogroup" aria-label="Medida">
          <button
            type="button"
            role="radio"
            :aria-checked="unit === 'tasks'"
            @click="unit = 'tasks'"
          >
            Tarefas
          </button>
          <button
            type="button"
            role="radio"
            :aria-checked="unit === 'points'"
            @click="unit = 'points'"
          >
            Pontos
          </button>
        </div>
      </div>

      <p v-if="!data.total" class="text-13 text-fg-muted">
        Este ciclo ainda não tem tarefas. O gráfico aparece quando houver.
      </p>
      <p v-else-if="!data.days.length" class="text-13 text-fg-muted">
        O ciclo começa em {{ shortDate(data.start_date) }}. O gráfico aparece a partir daí.
      </p>

      <div v-else class="relative">
        <svg
          :viewBox="`0 0 ${W} ${H}`"
          class="w-full touch-none select-none"
          role="img"
          :aria-label="`Burndown: começou com ${total} e faltam ${values.at(-1)} ${unit === 'points' ? 'pontos' : 'tarefas'}`"
          @pointermove="onMove"
          @pointerleave="hover = null"
        >
          <g class="text-fg-muted">
            <line
              v-for="tick in ticks"
              :key="tick"
              :x1="PAD.left"
              :x2="W - PAD.right"
              :y1="y(tick)"
              :y2="y(tick)"
              stroke="var(--ds-border)"
            />
            <text
              v-for="tick in ticks"
              :key="`t${tick}`"
              :x="PAD.left - 8"
              :y="y(tick) + 4"
              text-anchor="end"
              font-size="11"
              fill="currentColor"
            >
              {{ tick }}
            </text>
            <text
              v-for="label in dayLabels"
              :key="label.index"
              :x="x(label.index)"
              :y="H - 8"
              text-anchor="middle"
              font-size="11"
              fill="currentColor"
            >
              {{ label.text }}
            </text>
          </g>
          <line
            :x1="x(0)"
            :y1="y(total)"
            :x2="x(span)"
            :y2="y(0)"
            stroke="var(--ds-fg-muted)"
            stroke-width="2"
            stroke-dasharray="5 5"
          />
          <path
            :d="actualPath"
            fill="none"
            stroke="var(--ds-accent)"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <template v-if="hover !== null">
            <line
              :x1="x(hover)"
              :x2="x(hover)"
              :y1="PAD.top"
              :y2="PAD.top + plotH"
              stroke="var(--ds-border-strong)"
            />
            <circle
              :cx="x(hover)"
              :cy="y(values[hover]!)"
              r="4"
              fill="var(--ds-accent)"
              stroke="var(--ds-surface-1)"
              stroke-width="2"
            />
          </template>
        </svg>
        <div
          v-if="hover !== null"
          class="pointer-events-none absolute top-0 rounded-control border border-border bg-surface-2 px-2.5 py-1.5 text-12 shadow-float"
          :style="{ left: `${(x(hover) / W) * 100}%`, transform: 'translateX(-50%)' }"
        >
          <p class="font-medium text-fg">{{ shortDate(data.days[hover]!.date) }}</p>
          <p class="text-fg-muted">
            Faltando: <span class="font-mono text-fg">{{ values[hover] }}</span>
          </p>
          <p class="text-fg-muted">
            Ideal: <span class="font-mono text-fg">{{ Math.round(ideal(hover)) }}</span>
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { TrendingDown, TrendingUp, type LucideIcon } from '@lucide/vue'
import { computed, useId } from 'vue'

/** Indicador do início: ícone, nome, valor, variação real e, quando houver série, a tendência. */
const props = defineProps<{
  icon: LucideIcon
  title: string
  value: number
  description: string
  /** variação percentual real; null esconde o selo */
  change: number | null
  /** série real (mais antiga primeiro) para a linha de tendência */
  trend?: number[]
  accent?: boolean
}>()

const W = 96
const H = 32
const path = computed(() => {
  const points = props.trend ?? []
  if (points.length < 2) return null
  const max = Math.max(1, ...points)
  const step = W / (points.length - 1)
  const coords = points.map((v, i) => [i * step, H - 3 - (v / max) * (H - 6)] as const)
  const line = coords
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ')
  return { line, area: `${line} L${W} ${H} L0 ${H} Z` }
})
const gradientId = useId()
</script>

<template>
  <article class="uo-card uo-card-interactive kpi flex h-full min-w-0 flex-col gap-4 p-4 sm:p-5">
    <header class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span :class="['kpi-icon', { 'kpi-icon-accent': accent }]" aria-hidden="true">
        <component :is="icon" :size="18" :stroke-width="1.75" />
      </span>
      <h3 class="min-w-0 flex-1 text-13 leading-4 text-fg-muted">{{ title }}</h3>
      <span
        v-if="change !== null"
        :class="[
          'inline-flex h-6 items-center gap-1 rounded-full px-2 font-mono text-12',
          change >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
        ]"
        :aria-label="`${change >= 0 ? 'Alta' : 'Queda'} de ${Math.abs(change)}% sobre a semana anterior`"
      >
        <component :is="change >= 0 ? TrendingUp : TrendingDown" :size="12" aria-hidden="true" />
        {{ change > 0 ? '+' : '' }}{{ change }}%
      </span>
    </header>

    <div class="flex items-end justify-between gap-3">
      <div class="min-w-0">
        <p
          class="font-mono text-24 leading-none font-medium tracking-[-0.03em] text-fg tabular-nums sm:text-32"
        >
          {{ value }}
        </p>
        <p class="mt-2 line-clamp-2 text-12 text-fg-muted">{{ description }}</p>
      </div>
      <svg
        v-if="path"
        :viewBox="`0 0 ${W} ${H}`"
        class="kpi-trend hidden h-8 w-24 shrink-0 overflow-visible sm:block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#f99f11" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#f99f11" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path :d="path.area" :fill="`url(#${gradientId})`" />
        <path
          :d="path.line"
          fill="none"
          stroke="#f99f11"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          pathLength="1"
          class="kpi-line"
        />
      </svg>
    </div>
  </article>
</template>

<style scoped>
.kpi-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid var(--ds-border);
  border-radius: 10px;
  background: var(--ds-surface-2);
  color: var(--ds-fg);
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.kpi-icon-accent,
.kpi:hover .kpi-icon {
  border-color: rgb(249 159 17 / 0.3);
  background: rgb(249 159 17 / 0.1);
  color: var(--ds-accent);
}

.kpi-line {
  stroke-dasharray: 1;
  animation: kpi-draw 900ms var(--ease-out) 200ms both;
}

@keyframes kpi-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kpi-line {
    animation: none;
  }
}
</style>

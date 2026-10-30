<script setup lang="ts">
import { TrendingDown, TrendingUp, type LucideIcon } from '@lucide/vue'
import { computed, useId } from 'vue'

/**
 * Indicador do início, sobre a foto do topo: bloco colorido com o ícone, nome, valor,
 * variação real e, quando houver série real, a linha de tendência.
 */
const props = defineProps<{
  icon: LucideIcon
  title: string
  value: number
  description: string
  /** variação percentual real; null esconde o selo */
  change: number | null
  /** série real (mais antiga primeiro) para a linha de tendência */
  trend?: number[]
  /** cor do bloco do ícone e da linha */
  color: string
}>()

const W = 64
const H = 36
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
  <article class="kpi" :style="{ '--kpi': color }">
    <span class="kpi-icon" aria-hidden="true">
      <component :is="icon" :size="20" :stroke-width="2" />
    </span>
    <div class="min-w-0 flex-1">
      <h3 class="text-12 leading-4 text-white/65 sm:text-13">{{ title }}</h3>
      <p class="mt-1 flex items-baseline gap-2">
        <span
          class="font-mono text-24 leading-none font-semibold tracking-[-0.03em] text-white tabular-nums sm:text-[28px]"
        >
          {{ value }}
        </span>
        <span
          v-if="change !== null"
          :class="[
            'inline-flex items-center gap-0.5 font-mono text-12',
            change >= 0 ? 'text-[#4cc38a]' : 'text-[#f26b6b]',
          ]"
          :aria-label="`${change >= 0 ? 'Alta' : 'Queda'} de ${Math.abs(change)}% sobre a semana anterior`"
        >
          <component :is="change >= 0 ? TrendingUp : TrendingDown" :size="12" aria-hidden="true" />
          {{ Math.abs(change) }}%
        </span>
      </p>
      <p class="mt-1 truncate text-12 text-white/50">{{ description }}</p>
    </div>
    <svg
      v-if="path"
      :viewBox="`0 0 ${W} ${H}`"
      class="hidden h-9 w-16 shrink-0 overflow-visible sm:block"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.35" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path :d="path.area" :fill="`url(#${gradientId})`" />
      <path
        :d="path.line"
        fill="none"
        :stroke="color"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        pathLength="1"
        class="kpi-line"
      />
    </svg>
  </article>
</template>

<style scoped>
/* vidro escuro sobre a foto; a cor do indicador aparece no ícone e numa luz discreta */
.kpi {
  position: relative;
  display: flex;
  height: 100%;
  min-width: 0;
  align-items: center;
  gap: 14px;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: var(--radius-card);
  background:
    radial-gradient(
      80% 120% at 0% 0%,
      color-mix(in srgb, var(--kpi) 14%, transparent),
      transparent 60%
    ),
    rgb(12 12 12 / 0.72);
  padding: 16px;
  backdrop-filter: blur(14px);
  transition:
    transform var(--dur-base) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}

.kpi:hover {
  border-color: color-mix(in srgb, var(--kpi) 45%, transparent);
  box-shadow: 0 18px 40px -20px color-mix(in srgb, var(--kpi) 60%, transparent);
  transform: translateY(calc(-2px * var(--motion-on)));
}

.kpi-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--kpi), #fff 18%), var(--kpi));
  color: #ffffff;
  box-shadow: 0 8px 20px -8px var(--kpi);
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

@media (width < 40rem) {
  .kpi {
    gap: 10px;
    padding: 12px;
  }

  .kpi-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kpi-line {
    animation: none;
  }
}
</style>

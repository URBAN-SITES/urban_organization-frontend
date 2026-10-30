<script setup lang="ts">
import { computed } from 'vue'
import type { BillingCycle, Plan, PlanFeature } from '../types'
import { formatCurrency } from '../utils'
import { planPrice } from '../utils/plans'

const props = defineProps<{ plan: Plan; cycle: BillingCycle; current: boolean }>()

defineEmits<{ select: [] }>()

const price = computed(() => planPrice(props.plan, props.cycle))
// "R$ 29" sem centavos quando o valor é inteiro
const priceLabel = computed(() =>
  formatCurrency(price.value).replace(/,00$/, '').replace(/\s/, ' '),
)

const FEATURE_ICONS: Record<PlanFeature['icon'], { icon: string; class: string }> = {
  check: { icon: 'check', class: 'text-[#1e9e5a]' },
  ai: { icon: 'check', class: 'text-accent' },
  shield: { icon: 'verified_user', class: 'text-[#1e9e5a]' },
  locked: { icon: 'lock', class: 'text-fg-muted' },
}
</script>

<template>
  <article
    :class="[
      'uo-card uo-card-interactive flex h-full flex-col gap-[16px] overflow-hidden px-5 py-4',
      { 'is-highlighted': plan.highlighted },
    ]"
  >
    <span
      v-if="plan.highlighted"
      class="absolute top-4 right-4 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] leading-normal font-medium text-accent dark:bg-accent/15"
    >
      Recomendado
    </span>

    <header class="flex flex-col gap-[2px] leading-normal">
      <h2
        :class="[
          'text-[18px]! leading-normal! font-semibold! tracking-normal!',
          plan.highlighted ? 'text-accent' : '',
        ]"
      >
        {{ plan.name }}
      </h2>
      <p class="text-[13px] text-fg-muted">
        {{ plan.description }}
      </p>
    </header>

    <p class="flex flex-wrap items-baseline gap-x-[8px] gap-y-[2px]">
      <span
        :class="[
          'text-[38px] leading-none font-semibold tracking-[-0.04em]',
          plan.highlighted ? 'text-accent' : '',
        ]"
        >{{ priceLabel }}</span
      >
      <span class="text-[13px] text-fg-muted">
        {{ plan.priceNote }}
      </span>
    </p>
    <p
      v-if="cycle === 'yearly' && plan.monthlyPrice"
      class="-mt-[12px] text-[12px] leading-normal text-fg-muted"
    >
      cobrado anualmente
    </p>

    <button
      type="button"
      :disabled="current || plan.id === 'free'"
      :class="[
        'no-site-hover flex h-[42px] w-full cursor-pointer items-center justify-center gap-[6px] rounded-[10px] text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-60',
        plan.highlighted
          ? 'bg-accent text-accent-fg hover:bg-accent-hover'
          : current || plan.id === 'free'
            ? 'border border-border bg-surface-2 text-fg-muted dark:bg-white/5'
            : 'bg-accent text-accent-fg',
      ]"
      @click="$emit('select')"
    >
      {{ plan.cta }}
    </button>

    <ul class="flex flex-col gap-[10px] border-t border-border pt-[14px]">
      <li
        v-for="feature in plan.features"
        :key="feature.label"
        :class="[
          'flex items-start gap-[10px] text-[13px] leading-[19px]',
          feature.icon === 'locked' ? 'text-fg-muted' : '',
        ]"
      >
        <span
          :class="[
            'material-symbols-outlined mt-px text-[17px]!',
            FEATURE_ICONS[feature.icon].class,
          ]"
          aria-hidden="true"
          >{{ FEATURE_ICONS[feature.icon].icon }}</span
        >
        <span>
          <span v-if="feature.icon === 'locked'" class="sr-only">Não incluso: </span
          >{{ feature.label }}
        </span>
      </li>
    </ul>
  </article>
</template>

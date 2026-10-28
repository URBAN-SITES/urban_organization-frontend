<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'

export interface TabItem {
  value: string
  label: string
  count?: number
  disabled?: boolean
}

/**
 * Abas com setas/Home/End (ativação automática). O painel vem no slot default com `active`.
 * O indicador desliza entre as abas (transform), sem mudar layout.
 */
const model = defineModel<string>({ required: true })
const { tabs, label } = defineProps<{ tabs: TabItem[]; label: string }>()
const baseId = useId()
const list = ref<HTMLElement | null>(null)
const indicator = ref({ x: 0, width: 0 })

const enabled = computed(() => tabs.filter((tab) => !tab.disabled))

function measure() {
  const el = list.value?.querySelector<HTMLElement>('[aria-selected="true"]')
  if (el) indicator.value = { x: el.offsetLeft, width: el.offsetWidth }
}

watch(model, () => nextTick(measure))
watch(list, () => nextTick(measure))

function onKeydown(event: KeyboardEvent) {
  const index = enabled.value.findIndex((tab) => tab.value === model.value)
  let next: number | undefined
  if (event.key === 'ArrowRight') next = (index + 1) % enabled.value.length
  else if (event.key === 'ArrowLeft')
    next = (index - 1 + enabled.value.length) % enabled.value.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = enabled.value.length - 1
  if (next === undefined) return
  event.preventDefault()
  model.value = enabled.value[next]!.value
  void nextTick(() => document.getElementById(`${baseId}-tab-${model.value}`)?.focus())
}
</script>

<template>
  <div>
    <div
      ref="list"
      role="tablist"
      :aria-label="label"
      class="relative flex gap-1 overflow-x-auto border-b border-border"
      @keydown="onKeydown"
    >
      <button
        v-for="tab in tabs"
        :id="`${baseId}-tab-${tab.value}`"
        :key="tab.value"
        data-ui="tab"
        type="button"
        role="tab"
        :aria-selected="tab.value === model"
        :aria-controls="`${baseId}-panel`"
        :tabindex="tab.value === model ? 0 : -1"
        :disabled="tab.disabled"
        :class="[
          'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-t-control px-3 text-13 font-medium',
          'transition-colors duration-(--dur-fast) ease-out disabled:cursor-not-allowed disabled:opacity-50',
          tab.value === model ? 'text-fg' : 'text-fg-muted hover:text-fg',
        ]"
        @click="model = tab.value"
      >
        {{ tab.label }}
        <span
          v-if="tab.count !== undefined"
          class="rounded-full bg-surface-2 px-1.5 font-mono text-12 text-fg-muted tabular-nums"
        >
          {{ tab.count }}
        </span>
      </button>
      <span
        aria-hidden="true"
        class="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-accent transition-[transform,width] duration-(--dur-base) ease-in-out"
        :style="{ width: `${indicator.width}px`, transform: `translateX(${indicator.x}px)` }"
      />
    </div>
    <div
      :id="`${baseId}-panel`"
      role="tabpanel"
      :aria-labelledby="`${baseId}-tab-${model}`"
      tabindex="0"
      class="pt-4 outline-none"
    >
      <slot :active="model" />
    </div>
  </div>
</template>

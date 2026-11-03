<script setup lang="ts">
import { Ban, CalendarOff, CalendarRange, Crosshair } from '@lucide/vue'
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { UiButton, UiEmptyState } from '@/shared/components'
import type { Cycle, Status, Task } from '../types'
import {
  addDays,
  diffDays,
  localToday,
  monthBands,
  place,
  shiftSpan,
  taskSpan,
  timelineRange,
  type DaySpan,
} from '../utils/timeline'
import { shortDate } from './priority'

/**
 * Linha do tempo (Gantt) das tarefas: cada barra vai do início ao prazo.
 * Quem edita arrasta a barra para remarcar ou puxa as pontas para mudar início e prazo.
 */
const props = defineProps<{
  tasks: Task[]
  statuses: Status[]
  cycles: Cycle[]
  canEdit: boolean
}>()
const emit = defineEmits<{
  open: [id: string]
  reschedule: [id: string, dates: { start_date: string; due_date: string }]
}>()

type Zoom = 'week' | 'month'
const zoom = ref<Zoom>('week')
const DAY_WIDTH: Record<Zoom, number> = { week: 40, month: 16 }
const dayWidth = computed(() => DAY_WIDTH[zoom.value])
const today = localToday()

const CATEGORY_TONE = {
  todo: 'var(--ds-fg-muted)',
  in_progress: 'var(--ds-accent)',
  done: 'var(--ds-success)',
} as const
const statusOf = (task: Task) => props.statuses.find((s) => s.id === task.status_id)

const dated = computed(() =>
  props.tasks
    .map((task) => ({ task, span: taskSpan(task) }))
    .filter((row): row is { task: Task; span: DaySpan } => row.span !== null)
    .sort((a, b) => a.span.start.localeCompare(b.span.start) || a.task.position - b.task.position),
)
const undated = computed(() => props.tasks.filter((task) => !taskSpan(task)))
const range = computed(() =>
  timelineRange(
    dated.value.map((row) => row.span),
    props.cycles,
    today,
  ),
)
const months = computed(() => monthBands(range.value))
const days = computed(() =>
  Array.from({ length: range.value.days }, (_, index) => {
    const day = addDays(range.value.start, index)
    return { day, number: Number(day.slice(8)), weekStart: index % 7 === 0 }
  }),
)
const todayOffset = computed(() => diffDays(range.value.start, today))
const cycleBars = computed(() =>
  props.cycles.map((cycle) => ({
    cycle,
    ...place({ start: cycle.start_date, end: cycle.end_date }, range.value),
  })),
)

// ── arrastar para remarcar ────────────────────────────────────────────────
const drag = ref<{
  id: string
  mode: 'move' | 'start' | 'end'
  x: number
  span: DaySpan
  delta: number
} | null>(null)

function spanOf(row: { task: Task; span: DaySpan }): DaySpan {
  const current = drag.value
  return current && current.id === row.task.id
    ? shiftSpan(current.span, current.mode, current.delta)
    : row.span
}

function startDrag(
  event: PointerEvent,
  row: { task: Task; span: DaySpan },
  mode: 'move' | 'start' | 'end',
) {
  if (event.button !== 0) return
  if (!props.canEdit) return
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  drag.value = { id: row.task.id, mode, x: event.clientX, span: row.span, delta: 0 }
}

function onDrag(event: PointerEvent) {
  if (!drag.value) return
  drag.value.delta = Math.round((event.clientX - drag.value.x) / dayWidth.value)
}

function endDrag(row: { task: Task }) {
  const current = drag.value
  drag.value = null
  if (!current || current.id !== row.task.id) return
  if (current.delta === 0) {
    emit('open', row.task.id)
    return
  }
  const next = shiftSpan(current.span, current.mode, current.delta)
  emit('reschedule', row.task.id, { start_date: next.start, due_date: next.end })
}

// ── rolagem até hoje ──────────────────────────────────────────────────────
const scroller = useTemplateRef<HTMLElement>('scroller')
const LABEL_WIDTH = 240
function scrollToToday(smooth = true) {
  const el = scroller.value
  if (!el) return
  const left = todayOffset.value * dayWidth.value - (el.clientWidth - LABEL_WIDTH) / 3
  el.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' })
}
async function setZoom(value: Zoom) {
  zoom.value = value
  await nextTick()
  scrollToToday(false)
}
onMounted(() => scrollToToday(false))

const fullDate = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
function describe(task: Task, span: DaySpan) {
  const dates =
    span.start === span.end
      ? fullDate(span.start)
      : `${fullDate(span.start)} a ${fullDate(span.end)}`
  return `${task.title}: ${dates}, ${statusOf(task)?.name ?? 'sem status'}${task.is_blocked && !task.completed_at ? ', bloqueada' : ''}`
}
</script>

<template>
  <section class="flex min-h-0 flex-col gap-3" aria-label="Linha do tempo">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-13 text-fg-muted">
        {{ dated.length }} {{ dated.length === 1 ? 'tarefa' : 'tarefas' }} no período
        <template v-if="canEdit"> · arraste a barra para remarcar ou puxe as pontas</template>
      </p>
      <div class="flex items-center gap-2">
        <UiButton size="sm" variant="ghost" :icon="Crosshair" @click="scrollToToday()"
          >Hoje</UiButton
        >
        <div class="tl-zoom" role="radiogroup" aria-label="Escala">
          <button
            v-for="item in [
              { value: 'week', label: 'Dias' },
              { value: 'month', label: 'Semanas' },
            ] as const"
            :key="item.value"
            type="button"
            role="radio"
            :aria-checked="zoom === item.value"
            @click="setZoom(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>

    <UiEmptyState
      v-if="!dated.length && !cycles.length"
      :icon="CalendarRange"
      title="Nada para mostrar na linha do tempo"
      description="Dê um início ou um prazo às tarefas para vê-las aqui."
    />

    <div
      v-else
      ref="scroller"
      class="tl-scroller"
      :style="{ '--dw': `${dayWidth}px`, '--days': range.days, '--label': `${LABEL_WIDTH}px` }"
    >
      <div class="tl-grid">
        <!-- cabeçalho: meses e dias -->
        <div class="tl-head">
          <div class="tl-corner">Tarefa</div>
          <div class="tl-track">
            <div class="tl-months">
              <span
                v-for="month in months"
                :key="month.offset"
                :style="{
                  left: `calc(${month.offset} * var(--dw))`,
                  width: `calc(${month.length} * var(--dw))`,
                }"
              >
                {{ month.label }}
              </span>
            </div>
            <div class="tl-days" aria-hidden="true">
              <span
                v-for="(day, index) in days"
                v-show="zoom === 'week' || day.weekStart"
                :key="day.day"
                :class="{ 'is-today': day.day === today }"
                :style="{ left: `calc(${index} * var(--dw))` }"
              >
                {{ day.number }}
              </span>
            </div>
          </div>
        </div>

        <!-- ciclos como faixas -->
        <div v-if="cycleBars.length" class="tl-row tl-row-cycles">
          <div class="tl-label text-fg-muted">Ciclos</div>
          <div class="tl-track tl-lines">
            <span
              v-for="bar in cycleBars"
              :key="bar.cycle.id"
              class="tl-cycle"
              :title="`${bar.cycle.name}: ${shortDate(bar.cycle.start_date)} a ${shortDate(bar.cycle.end_date)}`"
              :style="{
                left: `calc(${bar.offset} * var(--dw))`,
                width: `calc(${bar.length} * var(--dw))`,
              }"
            >
              {{ bar.cycle.name }}
            </span>
          </div>
        </div>

        <div v-for="row in dated" :key="row.task.id" class="tl-row">
          <button type="button" class="tl-label" @click="emit('open', row.task.id)">
            <span
              class="tl-dot"
              :style="{ '--tone': CATEGORY_TONE[statusOf(row.task)?.category ?? 'todo'] }"
              aria-hidden="true"
            />
            <span :class="['truncate', row.task.completed_at ? 'text-fg-muted line-through' : '']">
              {{ row.task.title }}
            </span>
            <Ban
              v-if="row.task.is_blocked && !row.task.completed_at"
              :size="13"
              class="shrink-0 text-danger"
              aria-label="Bloqueada"
            />
          </button>
          <div class="tl-track tl-lines">
            <div
              class="tl-bar"
              role="button"
              tabindex="-1"
              :aria-label="describe(row.task, spanOf(row))"
              :class="{
                'is-dragging': drag?.id === row.task.id,
                'is-blocked': row.task.is_blocked && !row.task.completed_at,
                'is-done': !!row.task.completed_at,
                'can-edit': canEdit,
              }"
              :style="{
                '--tone': CATEGORY_TONE[statusOf(row.task)?.category ?? 'todo'],
                left: `calc(${place(spanOf(row), range).offset} * var(--dw))`,
                width: `calc(${place(spanOf(row), range).length} * var(--dw))`,
              }"
              :title="describe(row.task, spanOf(row))"
              @pointerdown="startDrag($event, row, 'move')"
              @pointermove="onDrag"
              @pointerup="endDrag(row)"
              @pointercancel="drag = null"
              @click="!canEdit && emit('open', row.task.id)"
            >
              <span
                v-if="canEdit"
                class="tl-handle is-start"
                aria-hidden="true"
                @pointerdown.stop="startDrag($event, row, 'start')"
                @pointermove="onDrag"
                @pointerup.stop="endDrag(row)"
              />
              <span class="tl-bar-text">{{ row.task.title }}</span>
              <span
                v-if="canEdit"
                class="tl-handle is-end"
                aria-hidden="true"
                @pointerdown.stop="startDrag($event, row, 'end')"
                @pointermove="onDrag"
                @pointerup.stop="endDrag(row)"
              />
            </div>
          </div>
        </div>

        <span
          v-if="todayOffset >= 0 && todayOffset < range.days"
          class="tl-today"
          :style="{ left: `calc(var(--label) + ${todayOffset} * var(--dw) + var(--dw) / 2)` }"
          aria-hidden="true"
        />
      </div>
    </div>

    <div v-if="undated.length" class="tl-undated">
      <p class="flex items-center gap-2 text-13 font-medium text-fg">
        <CalendarOff :size="15" class="text-fg-muted" aria-hidden="true" />
        Sem datas · {{ undated.length }}
      </p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="task in undated.slice(0, 24)"
          :key="task.id"
          type="button"
          class="tl-chip"
          @click="emit('open', task.id)"
        >
          {{ task.title }}
        </button>
        <span v-if="undated.length > 24" class="self-center text-12 text-fg-muted">
          e mais {{ undated.length - 24 }}
        </span>
      </div>
    </div>
  </section>
</template>

<style>
.tl-zoom {
  display: inline-flex;
  gap: 2px;
  border: 1px solid var(--ds-border);
  border-radius: 8px;
  background: var(--ds-bg-2);
  padding: 2px;
}

.tl-zoom > button {
  height: 26px;
  cursor: pointer;
  border-radius: 6px;
  padding-inline: 10px;
  font-size: var(--text-12);
  color: var(--ds-fg-muted);
  transition:
    color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}

.tl-zoom > button:hover {
  color: var(--ds-fg);
}

.tl-zoom > button[aria-checked='true'] {
  background: var(--ds-surface-3);
  color: var(--ds-fg);
}

.tl-zoom > button:focus-visible,
.tl-label:focus-visible,
.tl-chip:focus-visible {
  outline: 2px solid var(--ds-accent);
  outline-offset: 1px;
}

.tl-scroller {
  position: relative;
  min-height: 0;
  flex-shrink: 1;
  overflow: auto;
  border: 1px solid var(--ds-border);
  border-radius: var(--radius-card);
  background: var(--ds-surface-1);
  overscroll-behavior-x: contain;
}

.tl-grid {
  position: relative;
  width: calc(var(--label) + var(--days) * var(--dw));
  min-width: 100%;
}

.tl-head,
.tl-row {
  display: grid;
  grid-template-columns: var(--label) calc(var(--days) * var(--dw));
}

.tl-head {
  position: sticky;
  top: 0;
  z-index: 3;
  height: 52px;
  border-bottom: 1px solid var(--ds-border);
  background: var(--ds-surface-1);
}

.tl-corner,
.tl-label {
  position: sticky;
  left: 0;
  z-index: 2;
  border-right: 1px solid var(--ds-border);
  background: var(--ds-surface-1);
}

.tl-corner {
  display: flex;
  align-items: flex-end;
  padding: 0 14px 8px;
  font-size: var(--text-12);
  color: var(--ds-fg-muted);
}

.tl-track {
  position: relative;
}

.tl-months > span {
  position: absolute;
  top: 6px;
  overflow: hidden;
  border-left: 1px solid var(--ds-border);
  padding-left: 8px;
  font-size: var(--text-12);
  font-weight: 500;
  text-transform: capitalize;
  color: var(--ds-fg);
  white-space: nowrap;
}

.tl-days > span {
  position: absolute;
  top: 28px;
  width: var(--dw);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ds-fg-muted);
  text-align: center;
}

.tl-days > span.is-today {
  color: var(--ds-accent);
  font-weight: 600;
}

.tl-row {
  height: 40px;
  border-bottom: 1px solid var(--ds-border);
}

.tl-row:last-of-type {
  border-bottom: 0;
}

.tl-row:hover .tl-label,
.tl-row:hover .tl-lines {
  background-color: var(--ds-surface-2);
}

.tl-label {
  display: flex;
  min-width: 0;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  padding-inline: 14px;
  font-size: var(--text-13);
  color: var(--ds-fg);
  text-align: left;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.tl-row-cycles {
  height: 34px;
}

.tl-row-cycles .tl-label {
  cursor: default;
  font-size: var(--text-12);
}

.tl-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--tone);
}

/* fins de semana mais escuros; a grade começa sempre numa segunda */
.tl-lines {
  background-image:
    linear-gradient(
      90deg,
      transparent calc(var(--dw) * 5),
      rgb(255 255 255 / 0.025) calc(var(--dw) * 5)
    ),
    linear-gradient(90deg, var(--ds-border) 1px, transparent 1px);
  background-size:
    calc(var(--dw) * 7) 100%,
    calc(var(--dw) * 7) 100%;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.tl-cycle {
  position: absolute;
  top: 7px;
  height: 20px;
  overflow: hidden;
  border: 1px dashed color-mix(in srgb, var(--ds-accent) 55%, transparent);
  border-radius: 6px;
  background: var(--ds-accent-soft);
  padding-inline: 8px;
  font-size: 11px;
  line-height: 18px;
  color: var(--ds-accent);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tl-bar {
  position: absolute;
  top: 8px;
  display: flex;
  height: 24px;
  min-width: 6px;
  cursor: pointer;
  align-items: center;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--tone) 55%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--tone) 22%, var(--ds-surface-2));
  box-shadow: 0 1px 0 var(--ds-card-sheen) inset;
  touch-action: none;
  user-select: none;
  transition:
    left var(--dur-fast) var(--ease-out),
    width var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.tl-bar.can-edit {
  cursor: grab;
}

.tl-bar:hover {
  box-shadow:
    0 0 0 1px var(--tone),
    0 6px 18px -8px var(--tone);
}

.tl-bar.is-dragging {
  z-index: 1;
  cursor: grabbing;
  transition: none;
  box-shadow:
    0 0 0 1px var(--tone),
    0 10px 24px -8px rgb(0 0 0 / 0.6);
}

.tl-bar.is-done {
  opacity: 0.6;
}

.tl-bar.is-blocked {
  border-color: var(--ds-danger);
  background-image: repeating-linear-gradient(
    -45deg,
    transparent 0 6px,
    rgb(242 107 107 / 0.12) 6px 12px
  );
}

.tl-bar-text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  padding-inline: 8px;
  font-size: var(--text-12);
  color: var(--ds-fg);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tl-handle {
  width: 8px;
  height: 100%;
  flex-shrink: 0;
  cursor: ew-resize;
}

.tl-handle::after {
  display: block;
  width: 2px;
  height: 12px;
  margin: 5px auto 0;
  border-radius: 2px;
  content: '';
  background: var(--tone);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-out);
}

.tl-bar:hover .tl-handle::after,
.tl-bar.is-dragging .tl-handle::after {
  opacity: 1;
}

.tl-today {
  position: absolute;
  top: 44px;
  bottom: 0;
  z-index: 1;
  width: 2px;
  margin-left: -1px;
  background: var(--ds-accent);
  box-shadow: 0 0 10px var(--ds-glow);
  pointer-events: none;
}

.tl-today::before {
  position: absolute;
  top: 0;
  left: -3px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  content: '';
  background: var(--ds-accent);
}

.tl-undated {
  display: grid;
  flex-shrink: 0;
  gap: 8px;
  border: 1px dashed var(--ds-border-strong);
  border-radius: var(--radius-card);
  padding: 12px 14px;
}

.tl-chip {
  max-width: 240px;
  height: 28px;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid var(--ds-border);
  border-radius: 999px;
  background: var(--ds-bg-2);
  padding-inline: 10px;
  font-size: var(--text-12);
  color: var(--ds-fg-muted);
  white-space: nowrap;
  text-overflow: ellipsis;
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.tl-chip:hover {
  border-color: var(--ds-border-strong);
  color: var(--ds-fg);
}

@media (width < 40rem) {
  .tl-scroller {
    --label: 140px !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tl-bar {
    transition: none;
  }
}
</style>

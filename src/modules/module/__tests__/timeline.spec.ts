import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addDays,
  cycleProgress,
  diffDays,
  monthBands,
  place,
  shiftSpan,
  taskSpan,
  timelineRange,
} from '../utils/timeline.ts'

test('o período da tarefa usa início e prazo; uma data só vira um dia', () => {
  assert.deepEqual(taskSpan({ start_date: '2026-11-02', due_date: '2026-11-06' }), {
    start: '2026-11-02',
    end: '2026-11-06',
  })
  assert.deepEqual(taskSpan({ start_date: null, due_date: '2026-11-06' }), {
    start: '2026-11-06',
    end: '2026-11-06',
  })
  assert.equal(taskSpan({ start_date: null, due_date: null }), null)
})

test('a janela começa numa segunda, cobre tudo e tem semanas inteiras', () => {
  const range = timelineRange(
    [{ start: '2026-11-04', end: '2026-11-20' }],
    [{ start_date: '2026-10-28', end_date: '2026-11-10' }],
    '2026-11-03',
  )
  assert.equal(new Date(`${range.start}T00:00:00Z`).getUTCDay(), 1)
  assert.ok(range.start <= '2026-10-25')
  assert.ok(addDays(range.start, range.days - 1) >= '2026-11-27')
  assert.equal(range.days % 7, 0)
  assert.ok(range.days >= 35)
})

test('posiciona períodos e divide os meses', () => {
  const range = { start: '2026-10-26', days: 14 }
  assert.deepEqual(place({ start: '2026-10-28', end: '2026-10-30' }, range), {
    offset: 2,
    length: 3,
  })
  assert.deepEqual(
    monthBands(range).map((b) => [b.label, b.offset, b.length]),
    [
      ['out 2026', 0, 6],
      ['nov 2026', 6, 8],
    ],
  )
  assert.equal(diffDays('2026-10-26', '2026-11-08'), 13)
})

test('arrastar move ou estica sem inverter as datas', () => {
  const span = { start: '2026-11-02', end: '2026-11-04' }
  assert.deepEqual(shiftSpan(span, 'move', 3), { start: '2026-11-05', end: '2026-11-07' })
  assert.deepEqual(shiftSpan(span, 'end', 2), { start: '2026-11-02', end: '2026-11-06' })
  assert.deepEqual(shiftSpan(span, 'start', 5), { start: '2026-11-04', end: '2026-11-04' })
  assert.deepEqual(shiftSpan(span, 'end', -9), { start: '2026-11-02', end: '2026-11-02' })
})

test('progresso do ciclo pelo calendário', () => {
  const cycle = { start_date: '2026-11-01', end_date: '2026-11-10' }
  assert.deepEqual(cycleProgress(cycle, '2026-10-30'), { label: 'começa em 2 d', elapsed: 0 })
  assert.deepEqual(cycleProgress(cycle, '2026-11-05'), { label: 'faltam 5 d', elapsed: 50 })
  assert.deepEqual(cycleProgress(cycle, '2026-11-10'), { label: 'último dia', elapsed: 100 })
  assert.deepEqual(cycleProgress(cycle, '2026-11-11'), { label: 'encerrado', elapsed: 100 })
})

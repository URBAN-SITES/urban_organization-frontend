import assert from 'node:assert/strict'
import { test } from 'node:test'
import { activityText, dueBadge, kpis } from '../utils/userHome.ts'

const dashboard = {
  active_projects: 4,
  in_progress: 2,
  favorites: [],
  recent_activity: [],
  open_tasks: 6,
  due_this_week: 2,
  done_this_week: 9,
  done_last_week: 6,
  overdue: 1,
  overdue_title: 'Kit de identidade',
  today: [],
  weekly_done: [],
  open_by_sector: [],
}

test('kpis describe the week and fall back when nothing is late', () => {
  const cards = kpis(dashboard)
  assert.deepEqual(
    cards.map((card) => card.value),
    [4, 2, 9, 1],
  )
  assert.equal(cards[1]!.description, '6 abertas no total')
  assert.equal(cards[2]!.description, '+3 em relação à anterior')
  assert.equal(cards[3]!.description, 'Kit de identidade')
  assert.equal(kpis({ ...dashboard, overdue_title: null })[3]!.description, 'Nada atrasado')
  assert.equal(kpis({ ...dashboard, done_last_week: 9 })[2]!.description, 'Igual à semana anterior')
})

test('dueBadge marks late, today and tomorrow', () => {
  assert.deepEqual(dueBadge('2026-10-20', true, '2026-10-23'), {
    label: 'Atrasada',
    tone: 'danger',
  })
  assert.deepEqual(dueBadge('2026-10-23', false, '2026-10-23'), { label: 'Hoje', tone: 'warning' })
  assert.deepEqual(dueBadge('2026-10-24', false, '2026-10-23'), {
    label: 'Amanhã',
    tone: 'neutral',
  })
})

test('activityText turns a history entry into a sentence', () => {
  assert.deepEqual(activityText({ action: 'created', changes: {} }), { verb: 'criou' })
  assert.deepEqual(
    activityText({ action: 'moved', changes: { status: ['A fazer', 'Em andamento'] } }),
    { verb: 'moveu', target: 'para Em andamento' },
  )
  assert.deepEqual(activityText({ action: 'updated', changes: { assignee: [null, 'Ana'] } }), {
    verb: 'atribuiu',
    target: 'a Ana',
  })
  assert.deepEqual(activityText({ action: 'updated', changes: { assignee: ['Ana', null] } }), {
    verb: 'removeu o responsável de',
  })
  assert.deepEqual(
    activityText({ action: 'updated', changes: { due_date: [null, '2026-11-01'] } }),
    {
      verb: 'mudou o prazo de',
    },
  )
  assert.deepEqual(
    activityText({ action: 'updated', changes: { title: ['a', 'b'], priority: ['low', 'high'] } }),
    { verb: 'editou' },
  )
  assert.deepEqual(activityText({ action: 'commented', changes: { comment: 'oi' } }), {
    verb: 'comentou em',
  })
})

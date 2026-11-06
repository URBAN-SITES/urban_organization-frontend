import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  NO_FILTERS,
  activeFilters,
  dueLabel,
  filterTasks,
  linkOrigin,
  serverFilters,
  type BoardFilters,
} from '../utils/board.ts'
import type { Task } from '../types/kanban.ts'

const task = (over: Partial<Task>): Task => ({
  id: 'x',
  sector_id: 's',
  status_id: 'st',
  parent_id: null,
  title: 'Tarefa',
  description: '',
  priority: 'low',
  due_date: null,
  completed_at: null,
  assignee_id: null,
  assignee_name: null,
  position: 0,
  created_by_name: null,
  is_overdue: false,
  checklist_total: 0,
  checklist_done: 0,
  comment_count: 0,
  subtask_total: 0,
  subtask_done: 0,
  labels: [],
  start_date: null,
  cycle_id: null,
  is_blocked: false,
  key: null,
  estimate: null,
  epic_id: null,
  recurrence: '',
  archived_at: null,
  created_at: '',
  ...over,
})

const now = new Date(2026, 9, 24, 12) // 24/out/2026, horário local
const tasks = [
  task({
    id: 'a',
    title: 'Roteiro do vídeo',
    priority: 'high',
    assignee_id: 'me',
    due_date: '2026-10-24',
  }),
  task({
    id: 'b',
    title: 'Verba de mídia',
    is_overdue: true,
    assignee_name: 'Marina Souza',
    assignee_id: 'm',
    due_date: '2026-10-20',
  }),
  task({ id: 'c', title: 'Landing', priority: 'urgent', due_date: '2026-10-29' }),
  task({ id: 'd', title: 'Sem prazo', priority: 'medium' }),
]
const ids = (f: Partial<BoardFilters>, search = '') =>
  filterTasks(tasks, { ...NO_FILTERS, ...f }, search, 'me', now).map((t) => t.id)

test('filters by assignee, priority and due date', () => {
  assert.deepEqual(ids({}), ['a', 'b', 'c', 'd'])
  assert.deepEqual(ids({ assignee: 'me' }), ['a'])
  assert.deepEqual(ids({ assignee: 'none' }), ['c', 'd'])
  assert.deepEqual(ids({ assignee: 'm' }), ['b'])
  assert.deepEqual(ids({ priority: 'high+' }), ['a', 'c'])
  assert.deepEqual(ids({ priority: 'medium' }), ['d'])
  assert.deepEqual(ids({ due: 'overdue' }), ['b'])
  assert.deepEqual(ids({ due: 'today' }), ['a'])
  assert.deepEqual(ids({ due: 'week' }), ['a', 'c'])
  assert.deepEqual(ids({ due: 'none' }), ['d'])
})

test('filters combine and search ignores accents', () => {
  assert.deepEqual(ids({ priority: 'high+', due: 'week' }), ['a', 'c'])
  assert.deepEqual(ids({ priority: 'high+', assignee: 'none' }), ['c'])
  assert.deepEqual(ids({}, 'VIDEO'), ['a'])
  assert.deepEqual(ids({}, 'marina'), ['b'])
  assert.equal(activeFilters({ ...NO_FILTERS, due: 'week', priority: 'high+' }), 2)
})

test('due label counts days and hides for finished tasks', () => {
  assert.equal(dueLabel({ due_date: '2026-10-27', completed_at: null }, now), 'faltam 3 dias')
  assert.equal(dueLabel({ due_date: '2026-10-25', completed_at: null }, now), 'faltam 1 dia')
  assert.equal(dueLabel({ due_date: '2026-10-24', completed_at: null }, now), 'vence hoje')
  assert.equal(dueLabel({ due_date: '2026-10-22', completed_at: null }, now), 'atrasada há 2 dias')
  assert.equal(dueLabel({ due_date: '2026-10-22', completed_at: '2026-10-23T00:00:00Z' }, now), '')
})

test('link origin comes from the host', () => {
  assert.equal(linkOrigin('https://drive.google.com/x'), 'drive')
  assert.equal(linkOrigin('https://docs.google.com/document/d/1'), 'docs')
  assert.equal(linkOrigin('https://meet.google.com/abc'), 'meet')
  assert.equal(linkOrigin('https://exemplo.com'), 'link')
  assert.equal(linkOrigin('nao é url'), 'link')
})

test('filters and searches by label', () => {
  const bug = { id: 'l1', name: 'Bug', color: '#ef4444' }
  const rows = [task({ id: 'a', labels: [bug] }), task({ id: 'b' })]
  const ids = (list: Task[]) => list.map((item) => item.id)
  assert.deepEqual(ids(filterTasks(rows, { ...NO_FILTERS, label: 'l1' }, '', null)), ['a'])
  assert.deepEqual(ids(filterTasks(rows, NO_FILTERS, 'bug', null)), ['a'])
  assert.equal(activeFilters({ ...NO_FILTERS, label: 'l1' }), 1)
})

test('maps board filters to API params for the server-side table', () => {
  const day = new Date(2026, 9, 24, 12)
  assert.deepEqual(serverFilters(NO_FILTERS, '  bug ', 'u1', day), {
    parent__isnull: true,
    search: 'bug',
  })
  assert.deepEqual(
    serverFilters({ assignee: 'me', priority: 'high+', due: 'week', label: 'l1' }, '', 'u1', day),
    {
      parent__isnull: true,
      assignee: 'u1',
      priority__in: 'high,urgent',
      due_after: '2026-10-24',
      due_before: '2026-10-30',
      label: 'l1',
    },
  )
  assert.deepEqual(serverFilters({ ...NO_FILTERS, assignee: 'none', due: 'none' }, '', null, day), {
    parent__isnull: true,
    assignee__isnull: true,
    due_date__isnull: true,
  })
})

test('filtra por ciclo, fora de ciclos, e envia o mesmo para a API', () => {
  const rows = [task({ id: 'a', cycle_id: 'c1' }), task({ id: 'b' })]
  const pick = (cycle: string) =>
    filterTasks(rows, { ...NO_FILTERS, cycle }, '', null).map((t) => t.id)
  assert.deepEqual(pick('c1'), ['a'])
  assert.deepEqual(pick('none'), ['b'])
  assert.deepEqual(pick(''), ['a', 'b'])
  assert.equal(serverFilters({ ...NO_FILTERS, cycle: 'c1' }, '', null).cycle, 'c1')
  assert.equal(serverFilters({ ...NO_FILTERS, cycle: 'none' }, '', null).cycle__isnull, true)
})

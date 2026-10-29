import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  dayLabel,
  notificationActor,
  notificationKind,
  notificationPath,
  notificationTitle,
} from '../utils/index.ts'

test('the kind comes from what the notification carries', () => {
  assert.equal(
    notificationKind({ title: 'Ana mentioned you', data: { channel_id: 'c' } }),
    'mention',
  )
  assert.equal(notificationKind({ title: 'You were assigned to a task', data: {} }), 'assigned')
  assert.equal(notificationKind({ title: 'New comment on your task', data: {} }), 'comment')
  assert.equal(notificationKind({ title: 'Algo novo', data: {} }), 'other')
})

test('titles are translated and the actor is read from mentions', () => {
  assert.equal(notificationTitle('Ana mentioned you'), 'Ana mencionou você')
  assert.equal(notificationTitle('You were assigned to a task'), 'Você foi atribuído a uma tarefa')
  assert.equal(notificationActor('Ana Lima mentioned you'), 'Ana Lima')
  assert.equal(notificationActor('You were assigned to a task'), null)
})

test('the event decides the kind and where the notification leads', () => {
  const task = { event: 'task.mentioned', sector_id: 's1', task_id: 't1', organization_id: 'o1' }
  assert.equal(notificationKind({ title: 'x', data: task }), 'mention')
  assert.equal(notificationKind({ title: 'x', data: { event: 'task.status_changed' } }), 'status')
  assert.equal(
    notificationKind({ title: 'x', data: { event: 'organization.role_changed' } }),
    'organization',
  )
  assert.equal(notificationPath(task), '/setores/s1?task=t1')
  assert.equal(notificationPath({ channel_id: 'c' }), '/chat')
  assert.equal(
    notificationPath({ event: 'organization.invited', organization_id: 'o1' }),
    '/organizacoes',
  )
  assert.equal(
    notificationPath({ event: 'organization.role_changed', organization_id: 'o1' }),
    '/organizacoes/o1/membros',
  )
  assert.equal(notificationPath({}), '/notificacoes')
})

test('day labels for grouping', () => {
  const now = new Date(2026, 9, 29, 10)
  assert.equal(dayLabel(new Date(2026, 9, 29, 1).toISOString(), now), 'Hoje')
  assert.equal(dayLabel(new Date(2026, 9, 28, 23).toISOString(), now), 'Ontem')
  assert.match(dayLabel(new Date(2026, 9, 20).toISOString(), now), /20 de outubro de 2026/)
})

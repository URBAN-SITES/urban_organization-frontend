import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  commentParts,
  historyLines,
  insertMention,
  keptMentions,
  mentionQuery,
} from '../utils/taskText.ts'

test('detects the @mention being typed before the caret', () => {
  assert.deepEqual(mentionQuery('oi @an', 6), { start: 3, query: 'an' })
  assert.deepEqual(mentionQuery('@', 1), { start: 0, query: '' })
  assert.equal(mentionQuery('email@empresa', 13), null) // @ grudado em texto não é menção
  assert.equal(mentionQuery('oi @ana ', 8), null) // já terminou com espaço
})

test('inserts the chosen name and keeps only mentions still in the text', () => {
  const result = insertMention('oi @an tudo bem', 3, 6, 'Ana Ribeiro')
  assert.deepEqual(result, { text: 'oi @Ana Ribeiro  tudo bem', caret: 16 })
  const picked = [
    { id: '1', name: 'Ana Ribeiro' },
    { id: '2', name: 'Paulo' },
  ]
  assert.deepEqual(keptMentions(result.text, picked), ['1'])
})

test('splits a comment into text and highlighted mentions', () => {
  assert.deepEqual(commentParts('@Ana Ribeiro, revisa?', [{ id: '1', name: 'Ana Ribeiro' }]), [
    { text: '@Ana Ribeiro', mention: true },
    { text: ', revisa?', mention: false },
  ])
  assert.deepEqual(commentParts('sem menção', []), [{ text: 'sem menção', mention: false }])
})

test('describes history entries in plain Portuguese', () => {
  assert.deepEqual(historyLines({ action: 'created', changes: {} }), ['criou a tarefa'])
  assert.deepEqual(
    historyLines({ action: 'moved', changes: { status: ['A fazer', 'Concluído'] } }),
    ['moveu de A fazer para Concluído'],
  )
  assert.deepEqual(
    historyLines({
      action: 'updated',
      changes: { priority: ['low', 'urgent'], assignee: ['Ana', null], labels: [null, 'Bug'] },
    }),
    ['mudou a prioridade para Urgente', 'removeu o responsável', 'mudou as etiquetas para Bug'],
  )
  assert.deepEqual(historyLines({ action: 'commented', changes: { comment: 'ok' } }), [
    'comentou: “ok”',
  ])
})

test('histórico descreve ciclo, épico, início e estimativa', () => {
  assert.deepEqual(
    historyLines({
      action: 'updated',
      changes: {
        epic: [null, 'Checkout'],
        cycle: ['Sprint 1', null],
        start_date: [null, '2026-03-02'],
        estimate: [null, '5'],
      },
    }),
    [
      'colocou no épico Checkout',
      'tirou do ciclo',
      'mudou o início para 02 de mar',
      'estimou em 5 pontos',
    ],
  )
})

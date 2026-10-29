import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clock, insightError, meetingProblem, searchSegments } from '../utils/index.ts'

const segments = [
  { id: 0, start: 0, end: 4, text: 'Bom dia, vamos revisar a sprint.' },
  { id: 1, start: 4, end: 9, text: 'Decidimos adiar o DEPLOY.' },
  { id: 2, start: 9, end: 15, text: 'Ana, revise a configuração até sexta.' },
]

test('clock matches the exported Markdown', () => {
  assert.equal(clock(0), '00:00')
  assert.equal(clock(75.9), '01:15')
  assert.equal(clock(3725), '1:02:05')
  assert.equal(clock(-3), '00:00')
})

test('search ignores case and accents', () => {
  assert.deepEqual(
    searchSegments(segments, 'configuracao').map((s) => s.id),
    [2],
  )
  assert.deepEqual(
    searchSegments(segments, 'deploy').map((s) => s.id),
    [1],
  )
  assert.equal(searchSegments(segments, '  ').length, 3)
  assert.equal(searchSegments(segments, 'xyz').length, 0)
})

test('worker errors are explained, with the technical detail kept', () => {
  assert.equal(insightError(''), '')
  assert.match(insightError('no_speech'), /fala/)
  assert.match(insightError('Recording longer than the limit (90 min).'), /limite.*90 min/)
  assert.match(insightError('Ollama unreachable: refused'), /modelo de resumo/)
  assert.match(insightError('boom'), /falhou.*boom/)
})

test('not configured code has its own message', () => {
  const problem = meetingProblem({ code: 'insights_not_configured' }, 'f')
  assert.equal(problem.code, 'insights_not_configured')
  assert.match(problem.message, /IA-REUNIOES/)
})

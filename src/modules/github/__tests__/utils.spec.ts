import assert from 'node:assert/strict'
import { test } from 'node:test'
import { githubProblem, pageCount } from '../utils/index.ts'

test('stable backend codes become clear Portuguese messages', () => {
  const expired = githubProblem({ code: 'github_not_connected', detail: 'x' }, 'fallback')
  assert.equal(expired.code, 'github_not_connected')
  assert.match(expired.message, /Conecte de novo/)
  assert.match(githubProblem({ code: 'github_forbidden' }, 'f').message, /permissão/)
  assert.match(githubProblem({ code: 'github_not_configured' }, 'f').message, /configurada/)
})

test('rate limit tells when to try again, only when that is in the future', () => {
  const now = new Date('2026-10-29T10:00:00Z')
  const later = githubProblem(
    { code: 'github_rate_limited', reset_at: '2026-10-29T10:30:00Z' },
    'f',
    now,
  )
  assert.match(later.message, /Tente de novo às \d{2}:\d{2}/)
  const past = githubProblem(
    { code: 'github_rate_limited', reset_at: '2026-10-29T09:00:00Z' },
    'f',
    now,
  )
  assert.doesNotMatch(past.message, /Tente de novo às/)
})

test('unknown answers fall back to the detail or the fallback', () => {
  assert.deepEqual(githubProblem({ detail: 'Já associado.' }, 'f'), {
    code: null,
    message: 'Já associado.',
  })
  assert.deepEqual(githubProblem(undefined, 'Falhou.'), { code: null, message: 'Falhou.' })
  assert.deepEqual(githubProblem({ code: 'other' }, 'Falhou.'), { code: null, message: 'Falhou.' })
})

test('page count never drops below one', () => {
  assert.equal(pageCount(0, 20), 1)
  assert.equal(pageCount(41, 20), 3)
})

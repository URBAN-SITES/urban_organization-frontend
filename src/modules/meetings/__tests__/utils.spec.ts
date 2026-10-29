import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatDuration,
  formatSize,
  fromIso,
  mediaProblem,
  meetingPhase,
  meetingProblem,
  recordingError,
  toIso,
} from '../utils/index.ts'

const named = (name: string) => Object.assign(new Error('x'), { name })

test('backend codes and field errors become messages', () => {
  const missing = meetingProblem({ code: 'meetings_not_configured', detail: 'x' }, 'f')
  assert.equal(missing.code, 'meetings_not_configured')
  assert.match(missing.message, /configuradas/)
  assert.match(meetingProblem({ code: 'livekit_unavailable' }, 'f').message, /não respondeu/)
  assert.equal(meetingProblem({ detail: 'Sem convite.' }, 'f').message, 'Sem convite.')
  assert.equal(meetingProblem({ ends_at: ['Fim antes.'] }, 'f').message, 'Fim antes.')
  assert.equal(meetingProblem(undefined, 'fallback').message, 'fallback')
})

test('denied or missing devices are explained per device', () => {
  assert.match(mediaProblem(named('NotAllowedError'), 'microfone'), /bloqueou o microfone/)
  assert.match(mediaProblem(named('NotAllowedError'), 'tela'), /cancelado ou bloqueado/)
  assert.match(mediaProblem(named('NotFoundError'), 'câmera'), /Nenhuma câmera/)
  assert.match(mediaProblem(named('NotReadableError'), 'microfone'), /^O microfone está em uso/)
  assert.match(mediaProblem('weird', 'câmera'), /Não foi possível usar a câmera/)
})

test('a meeting is live from ten minutes before it starts until it ends', () => {
  const meeting = { starts_at: '2026-10-30T14:00:00Z', ends_at: '2026-10-30T15:00:00Z' }
  assert.equal(meetingPhase(meeting, new Date('2026-10-30T13:45:00Z')), 'upcoming')
  assert.equal(meetingPhase(meeting, new Date('2026-10-30T13:51:00Z')), 'live')
  assert.equal(meetingPhase(meeting, new Date('2026-10-30T15:00:00Z')), 'live')
  assert.equal(meetingPhase(meeting, new Date('2026-10-30T15:00:01Z')), 'past')
})

test('durations, sizes and local date/time round-trip', () => {
  assert.equal(formatDuration(65), '1:05')
  assert.equal(formatDuration(3725), '1:02:05')
  assert.equal(formatSize(2048), '2 KB')
  assert.equal(formatSize(5 * 1024 ** 2), '5 MB')
  assert.equal(formatSize(1.5 * 1024 ** 3), '1.5 GB')
  assert.deepEqual(fromIso(toIso('2026-11-03', '09:30')), { date: '2026-11-03', time: '09:30' })
})

test('recording errors are readable', () => {
  assert.equal(recordingError(''), '')
  assert.match(recordingError('limit_reached'), /trecho gravado foi salvo/)
  assert.match(recordingError('upload failed'), /upload failed/)
})

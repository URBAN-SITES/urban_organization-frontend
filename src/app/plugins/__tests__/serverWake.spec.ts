import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AxiosError, type AxiosResponse } from 'axios'
import { isTransient, serverWaking, whileServerWakes } from '../serverWake.ts'

const timeout = () => new AxiosError('timeout of 60000ms exceeded', 'ECONNABORTED')
const status = (code: number) =>
  new AxiosError('fail', 'ERR', undefined, undefined, { status: code } as AxiosResponse)
const noWait = async () => undefined

test('a timeout or a server still starting is worth retrying; 401 is not', () => {
  assert.equal(isTransient(timeout()), true)
  assert.equal(isTransient(status(502)), true)
  assert.equal(isTransient(status(503)), true)
  assert.equal(isTransient(status(401)), false)
  assert.equal(isTransient(new Error('boom')), false)
})

test('keeps trying while the server wakes up, then returns the answer', async () => {
  const answers = [timeout(), status(502)]
  let calls = 0
  const waking: boolean[] = []
  const user = await whileServerWakes(
    async () => {
      calls += 1
      const next = answers.shift()
      if (next) throw next
      return { id: 'user' }
    },
    [1, 1, 1],
    async () => waking.push(serverWaking.value),
  )
  assert.deepEqual(user, { id: 'user' })
  assert.equal(calls, 3)
  assert.deepEqual(waking, [true, true]) // the notice shows while waiting
  assert.equal(serverWaking.value, false) // and goes away at the end
})

test('a real answer like 401 is not retried', async () => {
  let calls = 0
  await assert.rejects(
    whileServerWakes(
      async () => {
        calls += 1
        throw status(401)
      },
      [1, 1],
      noWait,
    ),
  )
  assert.equal(calls, 1)
})

test('gives up after the last retry so the page can offer "Tentar de novo"', async () => {
  let calls = 0
  await assert.rejects(
    whileServerWakes(
      async () => {
        calls += 1
        throw timeout()
      },
      [1, 1],
      noWait,
    ),
  )
  assert.equal(calls, 3)
  assert.equal(serverWaking.value, false)
})

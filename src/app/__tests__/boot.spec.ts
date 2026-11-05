import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isStaleChunkError } from '../boot.ts'

test('detects a chunk removed by a new deploy and ignores other errors', () => {
  const chrome = 'Failed to fetch dynamically imported module: https://x/assets/a.js'
  assert.equal(isStaleChunkError(new TypeError(chrome)), true)
  assert.equal(isStaleChunkError(new TypeError('Importing a module script failed.')), true)
  assert.equal(isStaleChunkError(new Error('Network Error')), false)
  assert.equal(isStaleChunkError('dynamically imported module'), false)
})

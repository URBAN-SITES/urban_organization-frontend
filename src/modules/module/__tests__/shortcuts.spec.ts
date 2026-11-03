import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isPlainShortcut } from '../utils/shortcuts.ts'

const key = (over: Record<string, unknown> = {}) => ({
  key: 'c',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  defaultPrevented: false,
  target: { tagName: 'BODY' },
  ...over,
})

test('atalho de uma tecla vale fora de campos e de modais', () => {
  assert.equal(isPlainShortcut(key()), true)
  assert.equal(isPlainShortcut(key({ target: { tagName: 'INPUT' } })), false)
  assert.equal(isPlainShortcut(key({ target: { tagName: 'TEXTAREA' } })), false)
  assert.equal(isPlainShortcut(key({ target: { isContentEditable: true } })), false)
  assert.equal(isPlainShortcut(key({ ctrlKey: true })), false)
  assert.equal(isPlainShortcut(key({ defaultPrevented: true })), false)
  assert.equal(isPlainShortcut(key(), true), false)
})

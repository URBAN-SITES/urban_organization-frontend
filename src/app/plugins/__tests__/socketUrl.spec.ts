import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSocketUrl } from '../socketUrl.ts'

test('same origin socket carries no ticket and follows the page protocol', () => {
  assert.equal(buildSocketUrl('http://localhost:5173').href, 'ws://localhost:5173/ws/')
})

test('backend socket uses wss and sends the encoded ticket', () => {
  const url = buildSocketUrl('https://api.example.test', 'a:b/c')
  assert.equal(url.origin, 'wss://api.example.test')
  assert.equal(url.pathname, '/ws/')
  assert.equal(url.searchParams.get('ticket'), 'a:b/c')
})

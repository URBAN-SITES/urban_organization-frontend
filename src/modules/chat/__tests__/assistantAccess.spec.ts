import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chatRoutes } from '../router/index.ts'

// A IA deixou de ser paga: o assistente só exige login (guard global), sem desvio para planos.
const assistantRoute = chatRoutes.find((route) => route.path === '/assistente')

test('the assistant only requires a signed-in account', () => {
  assert.ok(assistantRoute)
  assert.equal(assistantRoute.meta?.requiresAuth, true)
  assert.equal(assistantRoute.beforeEnter, undefined)
})

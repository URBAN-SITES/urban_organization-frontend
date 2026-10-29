import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PROJECT_ICONS, projectIcon, projectPercent } from '../utils/projectAppearance.ts'

test('project progress is a rounded percent, or null without tasks', () => {
  assert.equal(projectPercent(1, 3), 33)
  assert.equal(projectPercent(0, 4), 0)
  assert.equal(projectPercent(0, 0), null)
  assert.equal(projectPercent(null, null), null)
})

test('unknown or legacy icon names fall back to the folder', () => {
  assert.equal(projectIcon('rocket_launch'), projectIcon('folder'))
  assert.equal(projectIcon('rocket'), PROJECT_ICONS.find((item) => item.key === 'rocket')?.icon)
  assert.ok(PROJECT_ICONS.every((item) => /^[a-z0-9_-]+$/.test(item.key)))
})

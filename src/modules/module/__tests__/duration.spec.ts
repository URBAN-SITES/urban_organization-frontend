import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clock, formatMinutes, parseDuration } from '../utils/duration.ts'

test('formatMinutes writes minutes and hours in Portuguese', () => {
  assert.equal(formatMinutes(0), '0 min')
  assert.equal(formatMinutes(25), '25 min')
  assert.equal(formatMinutes(60), '1 h')
  assert.equal(formatMinutes(125), '2 h 05 min')
})

test('clock shows elapsed time since the start', () => {
  const start = '2026-11-04T10:00:00Z'
  const at = (s: number) => new Date(start).getTime() + s * 1000
  assert.equal(clock(start, at(247)), '04:07')
  assert.equal(clock(start, at(3847)), '1:04:07')
  assert.equal(clock(start, at(-5)), '00:00')
})

test('parseDuration understands the usual ways of typing time', () => {
  assert.equal(parseDuration('45'), 45)
  assert.equal(parseDuration('45m'), 45)
  assert.equal(parseDuration('1h'), 60)
  assert.equal(parseDuration('1h30'), 90)
  assert.equal(parseDuration('1h 30min'), 90)
  assert.equal(parseDuration('1:30'), 90)
  assert.equal(parseDuration('1,5h'), 90)
  assert.equal(parseDuration(''), null)
  assert.equal(parseDuration('abc'), null)
  assert.equal(parseDuration('0'), null)
  assert.equal(parseDuration('25h'), null)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emailProblem, passwordProblem, passwordStrength } from '../utils/index.ts'

test('accepts a normal e-mail and explains the invalid ones', () => {
  assert.equal(emailProblem('  voce@email.com '), '')
  assert.equal(emailProblem(''), 'Informe seu e-mail.')
  assert.match(emailProblem('voce@email'), /e-mail válido/)
  assert.match(emailProblem('voce email@x.com'), /e-mail válido/)
})

test('mirrors the backend password rules', () => {
  assert.equal(passwordProblem(''), 'Crie uma senha.')
  assert.equal(passwordProblem('abc12345'), 'Use pelo menos 9 caracteres.')
  assert.equal(passwordProblem('123456789'), 'A senha não pode ter só números.')
  assert.equal(passwordProblem('inceptum-9'), '')
})

test('strength grows with length, mixed characters and symbols', () => {
  assert.equal(passwordStrength(''), 0)
  assert.equal(passwordStrength('abcdefghi'), 1)
  assert.equal(passwordStrength('abcdefgh1'), 2)
  assert.equal(passwordStrength('abcdefgh1!'), 3)
  assert.equal(passwordStrength('abcdefgh1!xy'), 4)
})

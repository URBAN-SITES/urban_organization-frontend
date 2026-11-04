import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AutomationRule } from '../types'
import { actionNeeds, describeRule, triggerNeeds } from '../utils/automation.ts'

const names = {
  status: (id: string) => ({ s1: 'Concluído' })[id],
  person: (id: string) => ({ p1: 'Ana' })[id],
  label: (id: string) => ({ l1: 'Bug' })[id],
  priority: (value: string) => ({ urgent: 'Urgente', high: 'Alta' })[value],
}
const rule = (data: Partial<AutomationRule>): AutomationRule => ({
  id: 'r',
  name: 'Regra',
  trigger: 'created',
  trigger_value: '',
  action: 'archive',
  action_value: '',
  is_active: true,
  run_count: 0,
  last_run_at: null,
  created_at: '2026-11-04T00:00:00Z',
  ...data,
})

test('describeRule reads like a sentence', () => {
  assert.equal(
    describeRule(
      rule({ trigger: 'moved', trigger_value: 's1', action: 'assign', action_value: 'p1' }),
      names,
    ),
    'Uma tarefa entra na coluna Concluído: atribuir a Ana.',
  )
  assert.equal(
    describeRule(
      rule({ trigger: 'priority', trigger_value: 'urgent', action: 'due', action_value: '0' }),
      names,
    ),
    'A prioridade muda para Urgente: definir o prazo para hoje.',
  )
  assert.equal(
    describeRule(rule({ trigger: 'overdue', action: 'label', action_value: 'gone' }), names),
    'O prazo de uma tarefa passa: adicionar a etiqueta item removido.',
  )
  assert.equal(
    describeRule(rule({ trigger: 'moved', action: 'due', action_value: '3' }), names),
    'Uma tarefa muda de coluna: definir o prazo para daqui a 3 dias.',
  )
})

test('what each trigger and action asks for', () => {
  assert.equal(triggerNeeds('moved'), 'status')
  assert.equal(triggerNeeds('created'), null)
  assert.equal(actionNeeds('notify'), 'person')
  assert.equal(actionNeeds('archive'), null)
})

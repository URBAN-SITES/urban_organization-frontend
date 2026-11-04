import type { AutomationAction, AutomationRule, AutomationTrigger } from '../types'

export const TRIGGER_TEXT: Record<AutomationTrigger, string> = {
  created: 'Uma tarefa é criada',
  moved: 'Uma tarefa entra na coluna',
  priority: 'A prioridade muda para',
  assigned: 'Alguém recebe a tarefa',
  overdue: 'O prazo de uma tarefa passa',
}

export const ACTION_TEXT: Record<AutomationAction, string> = {
  assign: 'Atribuir a',
  priority: 'Mudar a prioridade para',
  label: 'Adicionar a etiqueta',
  move: 'Mover para a coluna',
  due: 'Definir o prazo para daqui a',
  notify: 'Avisar',
  archive: 'Arquivar a tarefa',
}

/** O valor do gatilho é escolhido numa lista (coluna ou prioridade) ou não existe. */
export const triggerNeeds = (trigger: AutomationTrigger): 'status' | 'priority' | null =>
  trigger === 'moved' ? 'status' : trigger === 'priority' ? 'priority' : null

type ActionValue = 'person' | 'priority' | 'label' | 'status' | 'days' | null
const ACTION_NEEDS: Record<AutomationAction, ActionValue> = {
  assign: 'person',
  notify: 'person',
  priority: 'priority',
  label: 'label',
  move: 'status',
  due: 'days',
  archive: null,
}
/** O que a ação precisa como valor: uma pessoa, prioridade, etiqueta, coluna, dias ou nada. */
export const actionNeeds = (action: AutomationAction): ActionValue => ACTION_NEEDS[action]

export interface RuleNames {
  status: (id: string) => string | undefined
  person: (id: string) => string | undefined
  label: (id: string) => string | undefined
  priority: (value: string) => string | undefined
}

/** "Quando uma tarefa entra na coluna Concluído, atribuir a Ana." */
export function describeRule(rule: AutomationRule, names: RuleNames): string {
  const missing = 'item removido'
  let when = TRIGGER_TEXT[rule.trigger]
  if (rule.trigger === 'moved')
    when = rule.trigger_value
      ? `${when} ${names.status(rule.trigger_value) ?? missing}`
      : 'Uma tarefa muda de coluna'
  if (rule.trigger === 'priority')
    when = `${when} ${names.priority(rule.trigger_value) ?? rule.trigger_value}`
  let then = ACTION_TEXT[rule.action]
  const value = rule.action_value
  switch (actionNeeds(rule.action)) {
    case 'person':
      then = `${then} ${names.person(value) ?? missing}`
      break
    case 'priority':
      then = `${then} ${names.priority(value) ?? value}`
      break
    case 'label':
      then = `${then} ${names.label(value) ?? missing}`
      break
    case 'status':
      then = `${then} ${names.status(value) ?? missing}`
      break
    case 'days':
      then = value === '0' ? 'Definir o prazo para hoje' : `${then} ${value} dias`
      break
  }
  return `${when}: ${then.charAt(0).toLowerCase()}${then.slice(1)}.`
}

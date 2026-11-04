import type { TaskActivity } from '../types'

export interface MentionTarget {
  id: string
  name: string
}

/** "@consulta" sendo digitada logo antes do cursor (início dela e o texto depois do @). */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const match = /(^|\s)@([\p{L}\p{N}._-]{0,30})$/u.exec(text.slice(0, caret))
  if (!match) return null
  const query = match[2] ?? ''
  return { start: caret - query.length - 1, query }
}

/** Troca a "@consulta" pelo nome escolhido; devolve o texto novo e onde fica o cursor. */
export function insertMention(
  text: string,
  start: number,
  caret: number,
  name: string,
): { text: string; caret: number } {
  const token = `@${name} `
  return { text: text.slice(0, start) + token + text.slice(caret), caret: start + token.length }
}

/** Ids das pessoas escolhidas cujo "@Nome" continua no texto (apagou, não menciona). */
export function keptMentions(text: string, picked: MentionTarget[]): string[] {
  return [...new Set(picked.filter((p) => text.includes(`@${p.name}`)).map((p) => p.id))]
}

/** Separa o comentário em trechos de texto e de menção, para destacar as menções. */
export function commentParts(
  content: string,
  mentions: MentionTarget[],
): { text: string; mention: boolean }[] {
  const names = [...new Set(mentions.map((m) => m.name).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  )
  if (!names.length) return [{ text: content, mention: false }]
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  // o grupo de captura faz o split manter as menções como trechos próprios
  const pattern = new RegExp(`(@(?:${escaped.join('|')}))`)
  return content
    .split(pattern)
    .filter(Boolean)
    .map((text) => ({ text, mention: text.startsWith('@') && names.includes(text.slice(1)) }))
}

const PRIORITY: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

function day(value: string | null): string {
  if (!value) return 'sem prazo'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

/** Frases do histórico de uma tarefa, sem o nome de quem fez (vem antes, na tela). */
export function historyLines(entry: Pick<TaskActivity, 'action' | 'changes'>): string[] {
  if (entry.action === 'created') return ['criou a tarefa']
  if (entry.action === 'deleted') return ['excluiu a tarefa']
  if (entry.action === 'commented') {
    const comment = typeof entry.changes.comment === 'string' ? entry.changes.comment : ''
    return [comment ? `comentou: “${comment}”` : 'comentou']
  }
  const lines: string[] = []
  for (const [field, value] of Object.entries(entry.changes)) {
    if (!Array.isArray(value)) continue
    const [from, to] = value
    if (field === 'title') lines.push(`renomeou para “${to ?? ''}”`)
    else if (field === 'description') lines.push('editou a descrição')
    else if (field === 'priority')
      lines.push(`mudou a prioridade para ${PRIORITY[to ?? ''] ?? to ?? 'nenhuma'}`)
    else if (field === 'due_date')
      lines.push(to ? `mudou o prazo para ${day(to)}` : `removeu o prazo (era ${day(from)})`)
    else if (field === 'assignee') lines.push(to ? `atribuiu a ${to}` : 'removeu o responsável')
    else if (field === 'status') lines.push(`moveu de ${from ?? '—'} para ${to ?? '—'}`)
    else if (field === 'labels')
      lines.push(to ? `mudou as etiquetas para ${to}` : 'removeu as etiquetas')
    else if (field === 'start_date')
      lines.push(to ? `mudou o início para ${day(to)}` : 'removeu o início')
    else if (field === 'cycle') lines.push(to ? `colocou no ciclo ${to}` : 'tirou do ciclo')
    else if (field === 'epic') lines.push(to ? `colocou no épico ${to}` : 'tirou do épico')
    else if (field === 'estimate')
      lines.push(to === null ? 'removeu a estimativa' : `estimou em ${to} pontos`)
    else if (field === 'repeats') lines.push('repetiu a tarefa')
  }
  return lines.length ? lines : ['atualizou a tarefa']
}

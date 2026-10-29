import type { CheckState } from '../types'

export type GitHubErrorCode =
  | 'github_rate_limited'
  | 'github_not_connected'
  | 'github_forbidden'
  | 'github_unavailable'
  | 'github_not_configured'

const MESSAGES: Record<GitHubErrorCode, string> = {
  github_rate_limited: 'O GitHub limitou as consultas por enquanto.',
  github_not_connected: 'Sua conexão com o GitHub expirou ou foi revogada. Conecte de novo.',
  github_forbidden:
    'O app do Urban Organization não tem permissão para este repositório. Revise a instalação no GitHub.',
  github_unavailable: 'O GitHub não respondeu. Tente de novo em instantes.',
  github_not_configured: 'A integração com o GitHub ainda não foi configurada no servidor.',
}

export interface GitHubProblem {
  code: GitHubErrorCode | null
  message: string
}

/** Lê o `code` estável que o backend manda e explica em português. */
export function githubProblem(data: unknown, fallback: string, now = new Date()): GitHubProblem {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const code = typeof record.code === 'string' && record.code in MESSAGES ? record.code : null
  if (!code) {
    const detail = typeof record.detail === 'string' ? record.detail : ''
    return { code: null, message: detail || fallback }
  }
  let message = MESSAGES[code as GitHubErrorCode]
  if (code === 'github_rate_limited' && typeof record.reset_at === 'string') {
    const reset = new Date(record.reset_at)
    if (!Number.isNaN(reset.getTime()) && reset > now)
      message += ` Tente de novo às ${reset.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
  }
  return { code: code as GitHubErrorCode, message }
}

export const PULL_STATES: Record<
  string,
  { label: string; tone: 'neutral' | 'success' | 'danger' }
> = {
  open: { label: 'Aberto', tone: 'success' },
  draft: { label: 'Rascunho', tone: 'neutral' },
  merged: { label: 'Mergeado', tone: 'neutral' },
  closed: { label: 'Fechado', tone: 'danger' },
  deleted: { label: 'Apagada', tone: 'danger' },
}

export const CHECK_LABELS: Record<CheckState, string> = {
  success: 'Checks passaram',
  failure: 'Checks falharam',
  pending: 'Checks rodando',
  none: 'Sem checks',
}

/** Números de página mostrados na paginação, sem passar do total. */
export function pageCount(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize))
}

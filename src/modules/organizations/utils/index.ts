import type { OrganizationRole } from '../types'

export const roleLabels: Record<OrganizationRole, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
  viewer: 'Leitor',
  guest: 'Convidado externo',
}

export const TEAM_SIZES = [
  { value: '1', label: 'Só eu' },
  { value: '2-10', label: '2 a 10 pessoas' },
  { value: '11-50', label: '11 a 50 pessoas' },
  { value: '51-200', label: '51 a 200 pessoas' },
  { value: '201+', label: 'Mais de 200 pessoas' },
]

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Mensagem de erro do endereço (slug), ou '' quando está ok. */
export function slugProblem(value: string): string {
  return SLUG_PATTERN.test(value)
    ? ''
    : 'Use letras minúsculas, números e hífens, como norte-studio.'
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export function parseInvitationEmails(input: string): string[] {
  return [
    ...new Map(
      input
        .split(/[,;\s]+/)
        .filter(Boolean)
        .map((email) => [email.toLowerCase(), email]),
    ).values(),
  ]
}

export function workspaceSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
    .replace(/-$/, '')
}

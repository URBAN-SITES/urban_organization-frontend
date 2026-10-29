import { ChevronDown, ChevronsUp, ChevronUp, Equal } from '@lucide/vue'
import type { Component } from 'vue'
import type { TaskPriority } from '@/shared/types'

/** Prioridade: ícone + texto; só alta e urgente ganham cor (aviso e perigo). */
export const PRIORITIES: {
  value: TaskPriority
  label: string
  icon: Component
  tone: 'neutral' | 'warning' | 'danger'
}[] = [
  { value: 'low', label: 'Baixa', icon: ChevronDown, tone: 'neutral' },
  { value: 'medium', label: 'Média', icon: Equal, tone: 'neutral' },
  { value: 'high', label: 'Alta', icon: ChevronUp, tone: 'warning' },
  { value: 'urgent', label: 'Urgente', icon: ChevronsUp, tone: 'danger' },
]

export const priorityOf = (value: TaskPriority) =>
  PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[1]!

export const PRIORITY_TEXT = {
  neutral: 'text-fg-muted',
  warning: 'text-warning',
  danger: 'text-danger',
}

/** "2026-10-27" → "27 out" */
export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    .replace('.', '')
}

/* Classes visuais da tela (selos e botões de cabeçalho), só deste módulo. */

export const BADGE_BASE =
  'inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-[4px] border border-transparent px-1.5 text-12 font-medium whitespace-nowrap'

export const BADGE = {
  neutral: 'border-border! bg-surface-2 text-fg-muted',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-surface-2 text-fg',
  accent: 'bg-accent-soft text-accent',
  ink: 'bg-fg text-bg',
  outline: 'border-border! text-fg-muted',
  dashed: 'border-dashed! border-border-strong! text-fg-muted',
} as const

export type BadgeTone = keyof typeof BADGE

// botões de cabeçalho: mesmo tamanho dos UiButton do PageLayout
export const TOOLBAR_BUTTON = 'mt-0! h-8! px-3! text-13!'

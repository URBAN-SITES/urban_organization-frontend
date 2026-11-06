const COLORS = ['#c2410c', '#15803d', '#2563eb', '#6d28d9', '#b45309', '#0f766e']

/** Iniciais do primeiro e do último nome, sem pontuação: "Urban (demo)" vira "UD", não "U(". */
export function initials(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
  const letters = (words[0]?.[0] ?? '') + (words.length > 1 ? (words.at(-1)?.[0] ?? '') : '')
  return letters.toUpperCase() || '?'
}

/** Iniciais e uma cor estável para a pessoa. */
export function avatar(name: string): { initials: string; color: string } {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return { initials: initials(name), color: COLORS[hash % COLORS.length]! }
}

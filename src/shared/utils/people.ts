const COLORS = ['#c2410c', '#15803d', '#2563eb', '#6d28d9', '#b45309', '#0f766e']

/** Iniciais (primeiro e último nome) e uma cor estável para a pessoa. */
export function avatar(name: string): { initials: string; color: string } {
  const parts = name.trim().split(/\s+/)
  const initials = (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')
  ).toUpperCase()
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return { initials: initials || '?', color: COLORS[hash % COLORS.length]! }
}

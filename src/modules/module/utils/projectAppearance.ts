import {
  BookOpen,
  Briefcase,
  ChartColumn,
  Code,
  Folder,
  Globe,
  Lightbulb,
  Megaphone,
  Palette,
  Rocket,
  ShoppingCart,
  Target,
  Users,
  Wrench,
} from '@lucide/vue'
import type { Component } from 'vue'

/** Ícones que o projeto pode escolher. A chave é o que vai para o backend (campo `icon`). */
export const PROJECT_ICONS: { key: string; label: string; icon: Component }[] = [
  { key: 'folder', label: 'Pasta', icon: Folder },
  { key: 'rocket', label: 'Lançamento', icon: Rocket },
  { key: 'code', label: 'Código', icon: Code },
  { key: 'palette', label: 'Design', icon: Palette },
  { key: 'megaphone', label: 'Marketing', icon: Megaphone },
  { key: 'chart', label: 'Dados', icon: ChartColumn },
  { key: 'briefcase', label: 'Negócios', icon: Briefcase },
  { key: 'cart', label: 'Vendas', icon: ShoppingCart },
  { key: 'users', label: 'Pessoas', icon: Users },
  { key: 'wrench', label: 'Operações', icon: Wrench },
  { key: 'book', label: 'Conteúdo', icon: BookOpen },
  { key: 'lightbulb', label: 'Ideias', icon: Lightbulb },
  { key: 'target', label: 'Metas', icon: Target },
  { key: 'globe', label: 'Site', icon: Globe },
]

/** Cores de identificação (só pontos e ícones; não competem com o laranja de ação). */
export const PROJECT_COLORS: { value: string; label: string }[] = [
  { value: '#0ea5e9', label: 'Azul' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#eab308', label: 'Amarelo' },
  { value: '#14b8a6', label: 'Turquesa' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#64748b', label: 'Cinza' },
]

/** Ícone do projeto; valores antigos ou desconhecidos caem na pasta. */
export function projectIcon(key: string): Component {
  return PROJECT_ICONS.find((item) => item.key === key)?.icon ?? Folder
}

/** Porcentagem concluída, ou null quando o projeto não tem tarefas. */
export function projectPercent(done?: number | null, total?: number | null): number | null {
  if (!total) return null
  return Math.round(((done ?? 0) * 100) / total)
}

import {
  BarChart3,
  CalendarDays,
  Folder,
  House,
  Map as MapIcon,
  MessagesSquare,
  Receipt,
  Settings,
  Sparkles,
  Users,
  Bell,
  type LucideIcon,
} from '@lucide/vue'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** outras rotas que marcam este item como ativo */
  also?: string[]
  /** palavras extras para a busca da command palette */
  keywords?: string
}

/** Seções da organização atual, na ordem da barra lateral. */
export const workspaceNav: NavItem[] = [
  { to: '/', label: 'Visão geral', icon: House, keywords: 'inicio dashboard home' },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays, keywords: 'agenda prazos' },
  { to: '/chat', label: 'Mensagens', icon: MessagesSquare, keywords: 'chat conversa' },
  {
    to: '/equipe',
    label: 'Equipe',
    icon: Users,
    also: ['/organizacoes'],
    keywords: 'membros times pessoas',
  },
  { to: '/arquivos', label: 'Arquivos', icon: Folder, keywords: 'anexos documentos drive' },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, keywords: 'graficos metricas' },
  { to: '/assistente', label: 'Inceptum AI', icon: Sparkles, keywords: 'ia assistente gemini' },
  { to: '/mapbox', label: 'Mapa', icon: MapIcon, keywords: 'localizacao' },
]

export const accountNav: NavItem[] = [
  { to: '/notificacoes', label: 'Notificações', icon: Bell, keywords: 'avisos alertas' },
  {
    to: '/faturamento',
    label: 'Faturamento',
    icon: Receipt,
    also: ['/planos', '/pagamentos'],
    keywords: 'plano pagamento pix assinatura',
  },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, keywords: 'perfil conta tema' },
]

const startsWith = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

export function isNavActive(item: NavItem, path: string): boolean {
  if (item.to === '/') return path === '/'
  return [item.to, ...(item.also ?? [])].some((base) => startsWith(path, base))
}

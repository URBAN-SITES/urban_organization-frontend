import {
  BarChart3,
  Bell,
  CalendarDays,
  Folder,
  GitBranch,
  House,
  Map as MapIcon,
  MessagesSquare,
  Receipt,
  Settings,
  Sparkles,
  Users,
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

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

/** Seções da organização atual, agrupadas como aparecem na barra lateral. */
export const workspaceGroups: NavGroup[] = [
  {
    id: 'workspace',
    label: 'Trabalho',
    items: [
      { to: '/', label: 'Visão geral', icon: House, keywords: 'inicio dashboard home' },
      { to: '/calendario', label: 'Calendário', icon: CalendarDays, keywords: 'agenda prazos' },
      { to: '/chat', label: 'Mensagens', icon: MessagesSquare, keywords: 'chat conversa' },
    ],
  },
  {
    id: 'team',
    label: 'Colaboração',
    items: [
      {
        to: '/equipe',
        label: 'Equipe',
        icon: Users,
        also: ['/organizacoes'],
        keywords: 'membros times pessoas',
      },
      { to: '/arquivos', label: 'Arquivos', icon: Folder, keywords: 'anexos documentos drive' },
      { to: '/relatorios', label: 'Relatórios', icon: BarChart3, keywords: 'graficos metricas' },
    ],
  },
  {
    id: 'tools',
    label: 'Ferramentas',
    items: [
      { to: '/assistente', label: 'Inceptum AI', icon: Sparkles, keywords: 'ia assistente gemini' },
      { to: '/mapbox', label: 'Mapa', icon: MapIcon, keywords: 'localizacao' },
    ],
  },
]

/** Todas as seções da organização, na ordem da barra lateral. */
export const workspaceNav: NavItem[] = workspaceGroups.flatMap((group) => group.items)

export const accountNav: NavItem[] = [
  { to: '/notificacoes', label: 'Notificações', icon: Bell, keywords: 'avisos alertas' },
  {
    to: '/faturamento',
    label: 'Faturamento',
    icon: Receipt,
    also: ['/planos', '/pagamentos'],
    keywords: 'plano pagamento pix assinatura',
  },
  {
    to: '/integracoes/github',
    label: 'GitHub',
    icon: GitBranch,
    keywords: 'integracao repositorio pull request branch',
  },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, keywords: 'perfil conta tema' },
]

const startsWith = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

export function isNavActive(item: NavItem, path: string): boolean {
  if (item.to === '/') return path === '/'
  return [item.to, ...(item.also ?? [])].some((base) => startsWith(path, base))
}

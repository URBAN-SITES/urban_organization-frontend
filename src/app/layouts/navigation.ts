import {
  BarChart3,
  Bell,
  CalendarDays,
  ChartGantt,
  FileText,
  FolderKanban,
  GitBranch,
  Inbox,
  LayoutDashboard,
  LayoutList,
  Map as MapIcon,
  MessagesSquare,
  Settings,
  Sparkles,
  SquareKanban,
  Table2,
  Users,
  Video,
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
  /** regra própria de "ativo" (itens que dependem da aba aberta do projeto) */
  match?: (path: string, view: string) => boolean
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

/**
 * Tarefas, Kanban e Reuniões são abas de um projeto (/setores/:id?view=...). A barra lateral
 * abre essas abas no projeto em contexto; sem nenhum projeto, leva para a lista de projetos.
 */
export interface NavContext {
  projectsPath: string
  projectId: string | null
  /** convidado externo: só os projetos em que foi incluído (sem telas da organização) */
  guest?: boolean
}

// telas da organização que um convidado externo pode abrir
const GUEST_PATHS = new Set(['/', '/notificacoes', '/configuracoes'])
/** Tira do menu o que um convidado externo não acessa (o servidor também bloqueia). */
export const forGuest = (items: NavItem[]): NavItem[] =>
  items.filter((item) => GUEST_PATHS.has(item.to))

const dashboard: NavItem = {
  to: '/',
  label: 'Dashboard',
  icon: LayoutDashboard,
  keywords: 'inicio visao geral home',
}
const calendar: NavItem = {
  to: '/calendario',
  label: 'Calendário',
  icon: CalendarDays,
  keywords: 'agenda prazos',
}
const messages: NavItem = {
  to: '/chat',
  label: 'Mensagens',
  icon: MessagesSquare,
  keywords: 'chat conversa',
}
const team: NavItem = {
  to: '/equipe',
  label: 'Equipe',
  icon: Users,
  keywords: 'membros times pessoas',
  match: (path) =>
    path === '/equipe' || /^\/organizacoes\/[^/]+\/(membros|times|convidar)/.test(path),
}
const files: NavItem = {
  to: '/arquivos',
  label: 'Documentos',
  icon: FileText,
  keywords: 'arquivos anexos drive',
}
const github: NavItem = {
  to: '/integracoes/github',
  label: 'GitHub',
  icon: GitBranch,
  keywords: 'integracao repositorio pull request branch',
}
const assistant: NavItem = {
  to: '/assistente',
  label: 'Assistente IA',
  icon: Sparkles,
  keywords: 'ia urban ai gemini',
}
const reports: NavItem = {
  to: '/relatorios',
  label: 'Relatórios',
  icon: BarChart3,
  keywords: 'graficos metricas',
}
const map: NavItem = { to: '/mapbox', label: 'Mapa', icon: MapIcon, keywords: 'localizacao' }
// sem chave do Mapbox a tela só diria "indisponível": o item some do menu e da busca
const mapReady = Boolean(import.meta.env?.VITE_MAPBOX_API_KEY?.trim())
const maps = mapReady ? [map] : []

/** Grupos da barra lateral da organização. As telas de um projeto ficam na barra do projeto. */
export function sidebarGroups(context: NavContext): NavGroup[] {
  const projects: NavItem = {
    to: context.projectsPath,
    label: 'Projetos',
    icon: FolderKanban,
    keywords: 'setores quadros',
    match: (path) => /^\/organizacoes\/[^/]+\/(projetos|setores|configurar-setores)/.test(path),
  }
  const groups: NavGroup[] = [
    { id: 'general', label: 'Geral', items: [dashboard, projects, calendar, ...maps] },
    { id: 'collaboration', label: 'Colaboração', items: [messages, github] },
    { id: 'intelligence', label: 'Inteligência', items: [assistant, reports] },
  ]
  if (!context.guest) return groups
  // convidado externo só entra nos projetos em que foi incluído
  return [{ id: 'general', label: 'Geral', items: [dashboard, projects] }]
}

/** O projeto aberto na barra lateral: /setores/:id e /setores/:id/editar. */
export function projectInPath(path: string): string | null {
  return /^\/setores\/([^/]+)(?:\/editar)?$/.exec(path)?.[1] ?? null
}

/** Barra lateral de dentro de um projeto: cada aba dele vira um item. */
export function projectGroups(projectId: string, options: { guest?: boolean } = {}): NavGroup[] {
  const base = `/setores/${projectId}`
  const tab = (view: string, label: string, icon: LucideIcon, keywords = ''): NavItem => ({
    to: view === 'board' ? base : `${base}?view=${view}`,
    label,
    icon,
    keywords,
    match: (path, current) =>
      path === base && (current === view || (view === 'board' && current === '')),
  })
  const groups: NavGroup[] = [
    {
      id: 'project-work',
      label: 'Trabalho',
      items: [
        tab('board', 'Kanban', SquareKanban, 'quadro'),
        tab('list', 'Lista', LayoutList, 'tarefas'),
        tab('table', 'Tabela', Table2, 'planilha'),
        tab('timeline', 'Linha do tempo', ChartGantt, 'gantt prazos'),
      ],
    },
    {
      id: 'project-team',
      label: 'Projeto',
      items: [
        tab('ai', 'Assistente IA', Sparkles, 'ia chat gemini'),
        tab('pages', 'Documentos', FileText, 'paginas arquivos anexos'),
        tab('meetings', 'Reuniões', Video, 'chamada gravacao'),
        tab('intake', 'Pedidos', Inbox, 'solicitacoes'),
        tab('github', 'GitHub', GitBranch, 'repositorio importar'),
      ],
    },
  ]
  if (!options.guest)
    groups.push({
      id: 'project-settings',
      label: 'Ajustes',
      items: [
        {
          to: `${base}/editar`,
          label: 'Configurações',
          icon: Settings,
          keywords: 'colunas membros cor',
        },
      ],
    })
  return groups
}

/** Telas fixas da organização, para a busca (Ctrl+K). */
export const workspaceNav: NavItem[] = [
  dashboard,
  calendar,
  messages,
  team,
  files,
  github,
  assistant,
  reports,
  ...maps,
]

/** As abas fixas da barra inferior do celular (a de Projetos depende da organização). */
export const mobileTabs: NavItem[] = [dashboard, calendar, messages]

export const accountNav: NavItem[] = [
  { to: '/notificacoes', label: 'Notificações', icon: Bell, keywords: 'avisos alertas' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, keywords: 'perfil conta tema' },
]

const startsWith = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

export function isNavActive(item: NavItem, path: string, view = ''): boolean {
  if (item.match) return item.match(path, view)
  if (item.to === '/') return path === '/'
  return [item.to, ...(item.also ?? [])].some((base) => startsWith(path, base))
}

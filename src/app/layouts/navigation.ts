import {
  BarChart3,
  Bell,
  CalendarDays,
  FileText,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Map as MapIcon,
  MessagesSquare,
  Settings,
  Sparkles,
  SquareKanban,
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

const PROJECT_BOARD = /^\/setores\/[^/]+$/
const onProject = (path: string) => PROJECT_BOARD.test(path)
const TASK_VIEWS = ['list', 'table']

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

/** Grupos da barra lateral; os itens de projeto apontam para o projeto em contexto. */
export function sidebarGroups(context: NavContext): NavGroup[] {
  const project = (view?: string) =>
    context.projectId
      ? `/setores/${context.projectId}${view ? `?view=${view}` : ''}`
      : context.projectsPath

  const groups: NavGroup[] = [
    {
      id: 'general',
      label: 'Geral',
      items: [
        dashboard,
        {
          to: context.projectsPath,
          label: 'Projetos',
          icon: FolderKanban,
          keywords: 'setores',
          match: (path) =>
            /^\/organizacoes\/[^/]+\/(projetos|setores|configurar-setores)/.test(path) ||
            /^\/setores\/[^/]+\/editar$/.test(path),
        },
        {
          to: project('list'),
          label: 'Tarefas',
          icon: ListChecks,
          keywords: 'lista tabela',
          match: (path, view) => onProject(path) && TASK_VIEWS.includes(view),
        },
        {
          to: project(),
          label: 'Kanban',
          icon: SquareKanban,
          keywords: 'quadro',
          match: (path, view) => onProject(path) && (view === '' || view === 'board'),
        },
        calendar,
        map,
      ],
    },
    {
      id: 'collaboration',
      label: 'Colaboração',
      items: [
        {
          to: project('meetings'),
          label: 'Reuniões',
          icon: Video,
          keywords: 'meet chamada gravacao',
          match: (path, view) =>
            path.startsWith('/reunioes/') || (onProject(path) && view === 'meetings'),
        },
        messages,
        team,
        files,
        github,
      ],
    },
    { id: 'intelligence', label: 'Inteligência', items: [assistant, reports] },
  ]
  if (!context.guest) return groups
  // projetos, tarefas, quadro e reuniões vivem dentro do projeto: ficam; o resto sai
  const projectOnly = new Set(['Dashboard', 'Projetos', 'Tarefas', 'Kanban', 'Reuniões'])
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => projectOnly.has(item.label)),
    }))
    .filter((group) => group.items.length)
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
  map,
]

/** As quatro abas da barra inferior do celular. */
export const mobileTabs: NavItem[] = [dashboard, calendar, messages, team]

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

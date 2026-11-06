import axios from 'axios'
import { api } from '@/app/plugins/axios'
import type { UUID } from '@/shared/types'
import type {
  GitHubCallbackResult,
  GitHubProjectBoard,
  GitHubProjectImportResult,
  GitHubPurpose,
  GitHubStatus,
  ProjectRepository,
  RefOption,
  RepositoryActivity,
  RepositoryFilters,
  RepositoryPage,
  TaskGitHubLink,
  TaskLinkKind,
} from '../types'
import { githubProblem, type GitHubErrorCode } from '../utils'

/** Erro com o `code` do backend, para a tela decidir (ex.: mostrar "Conectar"). */
export class GitHubRequestError extends Error {
  readonly code: GitHubErrorCode | null

  constructor(message: string, code: GitHubErrorCode | null) {
    super(message)
    this.code = code
  }
}

async function call<T>(request: () => Promise<{ data: T }>, fallback: string): Promise<T> {
  try {
    return (await request()).data
  } catch (error) {
    const data = axios.isAxiosError(error) ? error.response?.data : undefined
    const problem = githubProblem(data, fallback)
    throw new GitHubRequestError(problem.message, problem.code)
  }
}

const BASE = '/integrations/github/'

export const getGitHubStatus = () =>
  call(() => api.get<GitHubStatus>(BASE), 'Não foi possível verificar o GitHub.')

export const getGitHubAuthorizeUrl = (purpose: GitHubPurpose) =>
  call(
    () => api.get<{ url: string }>(`${BASE}authorize/`, { params: { purpose } }),
    'Não foi possível falar com o GitHub.',
  ).then((data) => data.url)

export const finishGitHubAuthorization = (code: string, state: string) =>
  call(
    () => api.post<GitHubCallbackResult>(`${BASE}callback/`, { code, state }),
    'Não foi possível concluir a autorização do GitHub.',
  )

export const disconnectGitHub = () =>
  call(
    () => api.delete<{ revoked: boolean }>(`${BASE}connection/`),
    'Não foi possível desconectar o GitHub.',
  )

export const unlinkGitHubLogin = () =>
  call(() => api.delete<void>(`${BASE}identity/`), 'Não foi possível desvincular o login.')

export const listAuthorizedRepositories = (filters: RepositoryFilters) =>
  call(
    () =>
      api.get<RepositoryPage>(`${BASE}repositories/`, {
        params: {
          ...(filters.search && { search: filters.search }),
          ...(filters.visibility &&
            filters.visibility !== 'all' && { visibility: filters.visibility }),
          ...(filters.language && { language: filters.language }),
          ...(filters.page && filters.page > 1 && { page: filters.page }),
          ...(filters.refresh && { refresh: 'true' }),
        },
      }),
    'Não foi possível listar os repositórios.',
  )

export const listProjectRepositories = (sectorId: UUID) =>
  call(
    () => api.get<ProjectRepository[]>(`/sectors/${sectorId}/repositories/`),
    'Não foi possível carregar os repositórios do projeto.',
  )

export const linkProjectRepositories = (sectorId: UUID, githubIds: number[]) =>
  call(
    () =>
      api.post<ProjectRepository[]>(`/sectors/${sectorId}/repositories/`, {
        github_ids: githubIds,
      }),
    'Não foi possível associar os repositórios.',
  )

export const unlinkProjectRepository = (sectorId: UUID, repositoryId: UUID) =>
  call(
    () => api.delete<void>(`/sectors/${sectorId}/repositories/${repositoryId}/`),
    'Não foi possível desassociar o repositório.',
  )

export const getRepositoryActivity = (repositoryId: UUID) =>
  call(
    () => api.get<RepositoryActivity>(`/github/repositories/${repositoryId}/activity/`),
    'Não foi possível carregar a atividade do repositório.',
  )

export const listTaskGitHubLinks = (taskId: UUID) =>
  call(
    () => api.get<TaskGitHubLink[]>(`/tasks/${taskId}/github/`),
    'Não foi possível carregar os vínculos do GitHub.',
  )

export const searchTaskRefs = (taskId: UUID, q: string) =>
  call(
    () => api.get<RefOption[]>(`/tasks/${taskId}/github/search/`, { params: { q } }),
    'Não foi possível buscar branches e PRs.',
  )

export const linkTaskRef = (
  taskId: UUID,
  payload: { repository_id: UUID; kind: TaskLinkKind; ref: string },
) =>
  call(
    () => api.post<TaskGitHubLink>(`/tasks/${taskId}/github/`, payload),
    'Não foi possível vincular.',
  )

export const unlinkTaskRef = (taskId: UUID, linkId: UUID) =>
  call(
    () => api.delete<void>(`/tasks/${taskId}/github/${linkId}/`),
    'Não foi possível desvincular.',
  )

export const listGitHubProjects = () =>
  call(
    () => api.get<GitHubProjectBoard[]>(`${BASE}projects/`),
    'Não foi possível listar os quadros do GitHub.',
  )

/** Importa (ou importa de novo, sem duplicar) o quadro para o projeto. */
export const importGitHubProject = (sectorId: UUID, projectId: string) =>
  call(
    () =>
      api.post<GitHubProjectImportResult>(`/sectors/${sectorId}/github/projects/import/`, {
        project_id: projectId,
      }),
    'Não foi possível importar o quadro do GitHub.',
  )

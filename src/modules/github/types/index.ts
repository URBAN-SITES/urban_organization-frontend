import type { ISODateTime, UUID } from '@/shared/types'

export type GitHubPurpose = 'login' | 'link' | 'connect'

export interface GitHubStatus {
  configured: boolean
  install_url: string
  identity: { login: string } | null
  connection: { login: string; avatar_url: string; connected_at: ISODateTime } | null
  can_unlink: boolean
}

export interface GitHubCallbackResult {
  purpose: GitHubPurpose
  login?: string
}

export interface AuthorizedRepository {
  id: number
  name: string
  full_name: string
  owner: string
  private: boolean
  language: string
  description: string
  html_url: string
  default_branch: string
  pushed_at: ISODateTime | null
  installation_id: number
}

export type RepositoryVisibility = 'all' | 'public' | 'private'

export interface RepositoryFilters {
  search?: string
  visibility?: RepositoryVisibility
  language?: string
  page?: number
  refresh?: boolean
}

export interface RepositoryPage {
  count: number
  page: number
  page_size: number
  results: AuthorizedRepository[]
  languages: string[]
}

export interface ProjectRepository {
  id: UUID
  github_id: number
  full_name: string
  private: boolean
  html_url: string
  default_branch: string
  language: string
  linked_by_name: string
  created_at: ISODateTime
}

export type PullState = 'open' | 'draft' | 'closed' | 'merged'
export type CheckState = 'success' | 'failure' | 'pending' | 'none'

export interface RepositoryActivity {
  repository: string
  branches: { name: string; protected: boolean; html_url: string }[]
  pulls: {
    number: number
    title: string
    state: PullState
    author: string
    branch: string
    html_url: string
    updated_at: ISODateTime
    checks: CheckState | null
  }[]
  issues: {
    number: number
    title: string
    state: 'open' | 'closed'
    author: string
    html_url: string
    updated_at: ISODateTime
    comments: number
  }[]
}

export type TaskLinkKind = 'branch' | 'pull'

export interface TaskGitHubLink {
  id: UUID
  repository_id: UUID
  repository: string
  kind: TaskLinkKind
  ref: string
  title: string
  state: string
  html_url: string
  created_at: ISODateTime
}

export interface RefOption {
  repository_id: UUID
  repository: string
  kind: TaskLinkKind
  ref: string
  title: string
  state: string
}

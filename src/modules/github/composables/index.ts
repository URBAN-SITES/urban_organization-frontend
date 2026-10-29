import { getGitHubAuthorizeUrl } from '../services'
import type { GitHubPurpose } from '../types'

const PENDING_KEY = 'inceptum.githubReturnTo'

/** Leva ao consentimento do GitHub; `returnTo` é para onde voltar depois do callback. */
export async function startGitHubAuthorization(
  purpose: GitHubPurpose,
  returnTo = '/integracoes/github',
): Promise<void> {
  const url = await getGitHubAuthorizeUrl(purpose)
  try {
    sessionStorage.setItem(PENDING_KEY, returnTo)
  } catch {
    /* sem storage, o callback volta para a tela de integração */
  }
  window.location.assign(url)
}

export function takeGitHubReturnTo(fallback: string): string {
  try {
    const value = sessionStorage.getItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    // só caminhos internos: nada de redirecionar para fora do app
    return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback
  } catch {
    return fallback
  }
}

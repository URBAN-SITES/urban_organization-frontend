import { api } from './axios'
import { buildSocketUrl } from './socketUrl'

/**
 * Em produção a Vercel não encaminha WebSocket, então o socket vai direto ao backend
 * (VITE_WS_URL). Os cookies não atravessam domínios: o login vai num ticket de uso único.
 */
export async function realtimeUrl(): Promise<URL> {
  const backend = import.meta.env.VITE_WS_URL as string | undefined
  if (!backend) return buildSocketUrl(window.location.origin)
  const { data } = await api.post<{ ticket: string }>('/ws-ticket/')
  return buildSocketUrl(backend, data.ticket)
}

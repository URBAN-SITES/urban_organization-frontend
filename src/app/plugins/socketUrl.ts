/** Monta o endereço do socket a partir da origem da página ou do backend. */
export function buildSocketUrl(origin: string, ticket?: string): URL {
  const url = new URL('/ws/', origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  if (ticket) url.searchParams.set('ticket', ticket)
  return url
}

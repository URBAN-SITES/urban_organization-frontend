import { isAxiosError } from 'axios'
import { ref } from 'vue'

/**
 * O backend roda no plano grátis do Render, que dorme depois de ~15 min sem uso. O primeiro
 * pedido espera o servidor acordar (pode passar de 1 min) e o axios desiste aos 60 s: sem isto
 * a abertura do site mostrava "Não conseguimos confirmar sua sessão" depois de um tempo parado.
 */
export const serverWaking = ref(false)

/** Depois disto sem resposta, avisa que o servidor está acordando. */
const SLOW_MS = 6_000
/** Esperas entre as novas tentativas (o servidor acordado responde na hora). */
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 15_000]

/** Sem resposta (tempo esgotado, rede) ou o servidor ainda subindo: vale tentar de novo. */
export function isTransient(error: unknown): boolean {
  if (!isAxiosError(error)) return false
  const status = error.response?.status
  return status === undefined || status === 502 || status === 503 || status === 504
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Repete o pedido enquanto o servidor acorda; outros erros (401, 400...) sobem na hora. */
export async function whileServerWakes<T>(
  request: () => Promise<T>,
  delays: readonly number[] = RETRY_DELAYS_MS,
  wait: (ms: number) => Promise<unknown> = sleep,
): Promise<T> {
  const slow = setTimeout(() => (serverWaking.value = true), SLOW_MS)
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await request()
      } catch (error) {
        const delay = delays[attempt]
        if (!isTransient(error) || delay === undefined) throw error
        serverWaking.value = true
        await wait(delay)
      }
    }
  } finally {
    clearTimeout(slow)
    serverWaking.value = false
  }
}

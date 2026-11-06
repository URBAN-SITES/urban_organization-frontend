import { ref } from 'vue'
import type { Router } from 'vue-router'

/** Longest the opening screen may cover the app, even if the first route never settles. */
const SPLASH_CAP_MS = 10_000

/** True when the very first navigation could not finish (e.g. the session check failed offline). */
export const bootFailed = ref(false)

function dismissSplash(): void {
  const splash = document.getElementById('boot-splash')
  if (!splash || splash.dataset.done !== undefined) return
  splash.dataset.done = ''
  // the fade lives in index.html; remove the node once it is invisible
  window.setTimeout(() => splash.remove(), 260)
}

/** Hides the opening screen as soon as the first route resolves, successfully or not. */
export function installBootSplash(router: Router): void {
  const timer = window.setTimeout(dismissSplash, SPLASH_CAP_MS)
  const stop = router.afterEach((_to, _from, failure) => {
    stop()
    window.clearTimeout(timer)
    bootFailed.value = Boolean(failure) && router.currentRoute.value.matched.length === 0
    // one frame so the first screen is painted under the splash before it fades
    requestAnimationFrame(dismissSplash)
  })
  router.onError(() => {
    window.clearTimeout(timer)
    if (router.currentRoute.value.matched.length === 0) bootFailed.value = true
    dismissSplash()
  })
}

const STALE_CHUNK_ERROR =
  /dynamically imported module|Importing a module script failed|Unable to preload CSS/i
const STALE_CHUNK_KEY = 'urban:stale-chunk-reload'

export function isStaleChunkError(error: unknown): boolean {
  return error instanceof Error && STALE_CHUNK_ERROR.test(error.message)
}

/** Um deploy novo apaga os arquivos antigos: a aba aberta recarrega e segue para a rota pedida. */
export function installStaleChunkReload(router: Router): void {
  router.onError((error, to) => {
    if (!isStaleChunkError(error)) return
    try {
      // uma tentativa por rota, para um arquivo realmente ausente não virar um loop de recargas
      if (sessionStorage.getItem(STALE_CHUNK_KEY) === to.fullPath) return
      sessionStorage.setItem(STALE_CHUNK_KEY, to.fullPath)
    } catch {
      return
    }
    window.location.assign(to.fullPath)
  })
  router.afterEach((_to, _from, failure) => {
    if (failure) return
    try {
      sessionStorage.removeItem(STALE_CHUNK_KEY)
    } catch {
      // sem sessionStorage não há o que limpar
    }
  })
}

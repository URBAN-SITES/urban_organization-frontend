import { computed, ref } from 'vue'

type Theme = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'theme'

function readSaved(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // armazenamento bloqueado: segue o sistema
  }
  return 'system'
}

const media =
  typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)')
// index.html já aplicou a classe antes da pintura; aqui só sincronizamos o estado.
const theme = ref<Theme>(typeof window === 'undefined' ? 'system' : readSaved())
const systemDark = ref(media?.matches ?? false)
const isDarkValue = computed(
  () => theme.value === 'dark' || (theme.value === 'system' && systemDark.value),
)

function applyTheme(): void {
  document.documentElement.classList.toggle('dark', isDarkValue.value)
}

media?.addEventListener('change', (event) => {
  systemDark.value = event.matches
  applyTheme()
})

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> }
}

function setTheme(value: Theme): void {
  // telas como Configurações reaplicam o tema salvo; sem mudança, nada a animar
  if (value === theme.value) return
  theme.value = value
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // sem persistência; o tema vale para esta aba
  }
  const doc = document as ViewTransitionDocument
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Cross-fade nativo quando o navegador suporta; senão troca direto (o fallback simples).
  // uma troca seguida cancela o cross-fade anterior; o tema já foi aplicado, só a animação é pulada
  if (doc.startViewTransition && !reduced) doc.startViewTransition(applyTheme).ready.catch(() => {})
  else applyTheme()
}

const isDark = computed({
  get: () => isDarkValue.value,
  set: (value: boolean) => setTheme(value ? 'dark' : 'light'),
})

export function useTheme() {
  return {
    isDark,
    theme,
    setTheme,
    toggleTheme: () => {
      isDark.value = !isDark.value
    },
  }
}

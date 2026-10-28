import { usePreferredReducedMotion } from '@vueuse/core'
import { computed } from 'vue'

/** Espelho em JS dos tokens de motion de src/assets/tokens.css (ms). */
export const DURATION = {
  instant: 80,
  fast: 140,
  base: 220,
  slow: 320,
} as const

/** Saídas ~30% mais rápidas que as entradas. */
export const EXIT_DURATION = {
  fast: 100,
  base: 150,
  slow: 220,
} as const

export const EASING = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  in: 'cubic-bezier(0.55, 0, 1, 0.45)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const

/** Drag and drop e reordenação. */
export const SPRING = { stiffness: 400, damping: 30 } as const

/** Stagger de listas: intervalo entre itens e quantos itens animam. */
export const STAGGER = { step: 35, max: 8 } as const

/** Fade máximo quando o usuário pede menos movimento. */
export const REDUCED_FADE = 150

/** Atraso de entrada do item `index` numa lista; itens além do limite entram sem atraso. */
export function staggerDelay(index: number): number {
  return index < STAGGER.max ? index * STAGGER.step : 0
}

export function useReducedMotion() {
  const preference = usePreferredReducedMotion()
  return computed(() => preference.value === 'reduce')
}

import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('inert') && el.getClientRects().length > 0,
  )
}

/**
 * Prende o Tab dentro de `container` enquanto `active` for true e devolve o foco
 * a quem estava focado antes de abrir (normalmente o gatilho).
 */
export function useFocusTrap(
  container: Ref<HTMLElement | null>,
  active: Ref<boolean>,
  options: { initialFocus?: () => HTMLElement | null | undefined } = {},
) {
  let previous: HTMLElement | null = null

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !container.value) return
    const items = focusableIn(container.value)
    if (!items.length) {
      event.preventDefault()
      container.value.focus()
      return
    }
    const first = items[0]!
    const last = items[items.length - 1]!
    const current = document.activeElement
    if (event.shiftKey && (current === first || current === container.value)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function release() {
    document.removeEventListener('keydown', onKeydown, true)
    const target = previous
    previous = null
    if (target?.isConnected) target.focus()
  }

  watch(
    active,
    async (open) => {
      if (!open) return release()
      previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.addEventListener('keydown', onKeydown, true)
      await nextTick()
      const root = container.value
      if (!root) return
      const target = options.initialFocus?.() ?? focusableIn(root)[0] ?? root
      target.focus()
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (previous || active.value) release()
  })
}

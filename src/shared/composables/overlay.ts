import { useEventListener, useScrollLock } from '@vueuse/core'
import { onBeforeUnmount, watch, type Ref } from 'vue'
import { useFocusTrap } from './focusTrap'

// Sobreposições abertas, da mais antiga para a mais recente: Esc fecha só a do topo.
const stack: symbol[] = []

/**
 * Comportamento comum de Dialog e Drawer: trava o scroll da página, prende o foco,
 * fecha com Esc (só a camada do topo) e devolve o foco ao gatilho ao fechar.
 */
export function useModalLayer(
  open: Ref<boolean>,
  panel: Ref<HTMLElement | null>,
  close: () => void,
  options: { initialFocus?: () => HTMLElement | null | undefined } = {},
) {
  const id = Symbol('layer')
  const scrollLock = useScrollLock(typeof document === 'undefined' ? null : document.body)

  watch(
    open,
    (value) => {
      const index = stack.indexOf(id)
      if (value && index === -1) stack.push(id)
      if (!value && index !== -1) stack.splice(index, 1)
      scrollLock.value = stack.length > 0
    },
    { immediate: true },
  )

  useFocusTrap(panel, open, options)

  useEventListener(document, 'keydown', (event: KeyboardEvent) => {
    // um menu ou popover aberto por cima já tratou o Esc (preventDefault)
    if (event.key !== 'Escape' || event.defaultPrevented) return
    if (!open.value || stack[stack.length - 1] !== id) return
    event.preventDefault()
    close()
  })

  onBeforeUnmount(() => {
    const index = stack.indexOf(id)
    if (index !== -1) stack.splice(index, 1)
    scrollLock.value = stack.length > 0
  })
}

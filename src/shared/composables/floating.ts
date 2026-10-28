import { useEventListener } from '@vueuse/core'
import { nextTick, ref, watch, type Ref } from 'vue'

export type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'top' | 'bottom'

const GAP = 6
const MARGIN = 8

/**
 * Posiciona um elemento flutuante (fixed) junto ao gatilho, virando para o outro
 * lado quando não cabe. Devolve o estilo e a origem da transformação, para a
 * animação sair do gatilho.
 */
export function useFloating(
  reference: Ref<HTMLElement | null>,
  floating: Ref<HTMLElement | null>,
  open: Ref<boolean>,
  placement: Placement = 'bottom-start',
) {
  const style = ref<Record<string, string>>({ position: 'fixed', top: '0px', left: '0px' })
  const side = ref<'top' | 'bottom'>(placement.startsWith('top') ? 'top' : 'bottom')

  function update() {
    const anchor = reference.value
    const panel = floating.value
    if (!anchor || !panel) return
    const a = anchor.getBoundingClientRect()
    const width = panel.offsetWidth
    const height = panel.offsetHeight
    const viewportW = document.documentElement.clientWidth
    const viewportH = document.documentElement.clientHeight

    let vertical: 'top' | 'bottom' = placement.startsWith('top') ? 'top' : 'bottom'
    if (vertical === 'bottom' && a.bottom + GAP + height > viewportH - MARGIN && a.top > height)
      vertical = 'top'
    else if (vertical === 'top' && a.top - GAP - height < MARGIN) vertical = 'bottom'

    let left = placement.endsWith('end')
      ? a.right - width
      : placement === 'top' || placement === 'bottom'
        ? a.left + a.width / 2 - width / 2
        : a.left
    left = Math.min(Math.max(left, MARGIN), viewportW - width - MARGIN)
    const top = vertical === 'bottom' ? a.bottom + GAP : a.top - GAP - height

    side.value = vertical
    const originX = Math.min(Math.max(a.left + a.width / 2 - left, 0), width)
    style.value = {
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      transformOrigin: `${Math.round(originX)}px ${vertical === 'bottom' ? 'top' : 'bottom'}`,
    }
  }

  watch(open, async (value) => {
    if (!value) return
    await nextTick()
    update()
  })
  useEventListener(window, 'resize', () => open.value && update())
  useEventListener(window, 'scroll', () => open.value && update(), { capture: true, passive: true })

  return { style, side, update }
}

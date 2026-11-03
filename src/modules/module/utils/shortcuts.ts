/** Atalhos de teclado do app: a lista mostrada na ajuda (?) e a regra de quando valem. */
export interface Shortcut {
  keys: string[]
  label: string
}
export const SHORTCUT_GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: 'Em qualquer tela',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Buscar ou ir para' },
      { keys: ['N'], label: 'Nova tarefa rápida' },
      { keys: ['?'], label: 'Mostrar os atalhos' },
      { keys: ['Esc'], label: 'Fechar janela ou painel' },
    ],
  },
  {
    title: 'No projeto',
    items: [
      { keys: ['C'], label: 'Nova tarefa neste projeto' },
      { keys: ['/'], label: 'Buscar tarefas' },
      { keys: ['F'], label: 'Mostrar ou esconder filtros' },
      { keys: ['1', '…', '7'], label: 'Trocar a visualização' },
    ],
  },
]

type KeyTarget = { tagName?: string; isContentEditable?: boolean } | null

/**
 * Atalho de uma tecla só vale fora de campos de texto, sem Ctrl/Alt/Meta e
 * sem janela modal aberta.
 */
export function isPlainShortcut(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'defaultPrevented'> & {
    target: unknown
  },
  modalOpen = false,
): boolean {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return false
  if (modalOpen) return false
  const target = event.target as KeyTarget
  if (!target) return true
  if (target.isContentEditable) return false
  return !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName ?? '')
}

/** Há um diálogo ou painel modal aberto na página? */
export const modalIsOpen = () =>
  typeof document !== 'undefined' && !!document.querySelector('[aria-modal="true"]')

import { shallowRef } from 'vue'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** ação destrutiva: botão vermelho e foco inicial em Cancelar */
  danger?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void
}

/** Pedido aberto agora; lido pelo UiConfirmHost montado no App. */
export const pendingConfirm = shallowRef<PendingConfirm | null>(null)

/**
 * Substitui window.confirm por um diálogo acessível.
 * `if (await confirm({ title: 'Excluir tarefa?', danger: true })) ...`
 */
export function useConfirm() {
  return (options: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      // um pedido novo cancela o anterior, que nunca fica pendurado
      pendingConfirm.value?.resolve(false)
      pendingConfirm.value = { ...options, resolve }
    })
}

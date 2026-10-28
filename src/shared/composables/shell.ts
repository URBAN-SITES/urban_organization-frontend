import { computed, inject, type ComputedRef, type InjectionKey } from 'vue'

export interface ShellUser {
  name: string
  email: string
  avatarUrl: string
}

/** O que o layout da aplicação oferece às telas e ao cabeçalho. */
export interface ShellContext {
  organization: ComputedRef<string>
  unread: ComputedRef<number>
  user: ComputedRef<ShellUser | null>
  openPalette: () => void
  signOut: () => Promise<void>
}

export const ShellKey: InjectionKey<ShellContext> = Symbol('shell')

const empty: ShellContext = {
  organization: computed(() => ''),
  unread: computed(() => 0),
  user: computed(() => null),
  openPalette: () => undefined,
  signOut: async () => undefined,
}

export const useShell = (): ShellContext => inject(ShellKey, empty)

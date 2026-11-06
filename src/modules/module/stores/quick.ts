import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Janelas que abrem de qualquer tela (atalho N, ? e a paleta de comandos). */
export const useQuickActionsStore = defineStore('quickActions', () => {
  const taskOpen = ref(false)
  const shortcutsOpen = ref(false)
  return { taskOpen, shortcutsOpen }
})

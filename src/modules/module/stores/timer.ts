import { useIntervalFn } from '@vueuse/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMyTimer, startTimer, stopMyTimer } from '../services'
import type { RunningTimer, TimeEntry } from '../types'

/** Cronômetro da pessoa: um só por vez, visível em qualquer tela enquanto corre. */
export const useTimerStore = defineStore('timer', () => {
  const running = ref<RunningTimer | null>(null)
  const now = ref(Date.now())
  // incrementa a cada parada para quem mostra a lista de tempo de uma tarefa recarregar
  const version = ref(0)
  const { pause, resume } = useIntervalFn(() => (now.value = Date.now()), 1000, {
    immediate: false,
  })

  function set(timer: RunningTimer | null) {
    running.value = timer
    now.value = Date.now()
    if (timer) resume()
    else pause()
  }

  async function refresh() {
    set(await getMyTimer())
  }

  async function start(taskId: string) {
    set(await startTimer(taskId))
    version.value++
  }

  async function stop(): Promise<TimeEntry | null> {
    const stopped = await stopMyTimer()
    set(null)
    version.value++
    return stopped
  }

  return { running, now, version, refresh, start, stop }
})

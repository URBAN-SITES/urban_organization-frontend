<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Barra fina no topo enquanto uma navegação demora (chunk da rota, checagem de sessão).
 * Indeterminada: não inventa porcentagem. Navegações rápidas não chegam a mostrá-la.
 */
const SHOW_AFTER_MS = 120

const router = useRouter()
const visible = ref(false)
let pending = 0
let timer = 0

function start() {
  pending += 1
  if (!timer && !visible.value)
    timer = window.setTimeout(() => (visible.value = true), SHOW_AFTER_MS)
}

function done() {
  pending = Math.max(0, pending - 1)
  if (pending) return
  window.clearTimeout(timer)
  timer = 0
  visible.value = false
}

const removers = [router.beforeEach(start), router.afterEach(done), router.onError(done)]
onScopeDispose(() => {
  window.clearTimeout(timer)
  removers.forEach((remove) => remove())
})
</script>

<template>
  <Transition name="ui-fade">
    <div
      v-if="visible"
      class="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
      role="progressbar"
      aria-label="Carregando página"
    >
      <span class="route-progress-bar motion-keep absolute inset-y-0 left-0 w-1/3 bg-accent" />
    </div>
  </Transition>
</template>

<style scoped>
.route-progress-bar {
  animation: route-progress 1.1s var(--ease-in-out) infinite;
}

@keyframes route-progress {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(300%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .route-progress-bar {
    animation-duration: 2.4s;
  }
}
</style>

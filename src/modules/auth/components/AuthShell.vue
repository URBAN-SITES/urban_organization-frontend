<script setup lang="ts">
import { ChartNoAxesColumn, Moon, Sun, Users, Zap } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from '@/app/composables/useTheme'
import { UiIcon, UiIconButton } from '@/shared/components'

/**
 * Moldura das telas de acesso e do onboarding: painel de imagem de um lado, conteúdo do outro.
 * No cadastro o painel troca de lado (desliza para a direita) e o formulário passa para a esquerda.
 */
const { isDark, toggleTheme } = useTheme()
const route = useRoute()

// avançar no fluxo (entrar -> criar conta -> código) desliza para a esquerda; voltar, para a direita
const direction = ref(1)
watch(
  () => route.meta.authStep,
  (to, from) => (direction.value = (to ?? 0) >= (from ?? 0) ? 1 : -1),
)

const asideRight = computed(() => Boolean(route.meta.authAsideRight))

// entrar e criar conta ficam em cache: alternar entre elas não apaga o que já foi digitado
const KEEP = ['LoginView', 'RegisterView']
const image = `${import.meta.env.BASE_URL}aside-direita.webp`

const FEATURES = [
  { icon: Users, title: 'Equipes', text: 'mais produtivas' },
  { icon: Zap, title: 'Projetos', text: 'mais organizados' },
  { icon: ChartNoAxesColumn, title: 'Resultados', text: 'mais consistentes' },
]
</script>

<template>
  <div
    :data-aside="asideRight ? 'right' : 'left'"
    class="auth-shell grid min-h-dvh overflow-x-clip bg-bg text-fg lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
  >
    <!-- o painel é sempre escuro, independente do tema -->
    <aside
      class="auth-aside dark sticky top-0 hidden h-dvh flex-col justify-between overflow-hidden bg-black p-10 text-fg lg:flex xl:p-12"
    >
      <img
        :src="image"
        alt=""
        aria-hidden="true"
        class="absolute inset-0 size-full object-cover object-left"
      />
      <div
        class="absolute inset-0 bg-linear-to-t from-black via-black/40 to-black/10"
        aria-hidden="true"
      />

      <img src="/wordmark-inverse.svg" alt="Inceptum" class="relative w-36" />

      <div class="auth-aside-copy relative max-w-lg">
        <span class="mb-6 block h-0.5 w-8 bg-accent" aria-hidden="true" />
        <p class="text-32 leading-tight font-semibold tracking-[-0.02em]">
          Grandes projetos começam com <span class="text-accent">organização.</span>
        </p>
        <p class="mt-3 text-16 text-fg-muted">
          O Inceptum é o espaço onde equipes transformam ideias em resultados.
        </p>
        <ul class="mt-10 grid grid-cols-3 gap-4">
          <li v-for="feature in FEATURES" :key="feature.title" class="flex items-center gap-3">
            <span
              class="grid size-9 place-items-center rounded-control border border-border bg-surface-1/60"
              aria-hidden="true"
            >
              <UiIcon :icon="feature.icon" />
            </span>
            <span class="min-w-0 text-13 leading-tight">
              <span class="block text-fg">{{ feature.title }}</span>
              <span class="block text-fg-muted">{{ feature.text }}</span>
            </span>
          </li>
        </ul>
      </div>
    </aside>

    <!-- overflow-x-clip: o formulário que sai desliza para fora sem criar rolagem horizontal -->
    <main class="auth-main flex min-h-dvh min-w-0 flex-col overflow-x-clip px-4 py-5 sm:px-10">
      <div class="flex items-center justify-between">
        <span class="lg:invisible">
          <img src="/wordmark.svg" alt="Inceptum" class="w-28 dark:hidden" />
          <img src="/wordmark-inverse.svg" alt="Inceptum" class="hidden w-28 dark:block" />
        </span>
        <UiIconButton
          :icon="isDark ? Sun : Moon"
          :label="isDark ? 'Usar tema claro' : 'Usar tema escuro'"
          @click="toggleTheme"
        />
      </div>

      <!-- alinhado ao topo: formulários de alturas diferentes trocam sem o conteúdo pular -->
      <div class="flex flex-1 justify-center pt-8 pb-10 sm:pt-[max(2.5rem,10vh)]">
        <div class="auth-stage w-full max-w-100" :style="{ '--auth-dir': direction }">
          <!-- telas de acesso usam as rotas filhas; o onboarding passa o próprio conteúdo -->
          <slot>
            <RouterView v-slot="{ Component, route: current }">
              <Transition name="auth-slide" appear>
                <KeepAlive :include="KEEP">
                  <component :is="Component" :key="current.path" class="auth-view" />
                </KeepAlive>
              </Transition>
            </RouterView>
          </slot>
        </div>
      </div>

      <footer class="text-12 text-fg-muted">© 2026 Inceptum</footer>
    </main>
  </div>
</template>

<style>
/*
 * Troca de lado do painel (só no desktop, onde ele aparece). As colunas são 1,1fr e 1fr:
 * o painel anda a largura do conteúdo (1/1,1 da própria largura) e o conteúdo anda a do painel
 * (1,1 da própria). Só transform, então nada é recalculado no layout durante a troca.
 */
@media (min-width: 64rem) {
  .auth-aside,
  .auth-main {
    transition: transform var(--dur-slow) var(--ease-in-out);
  }

  /* o painel preto passa por cima dos formulários durante a troca */
  .auth-aside {
    z-index: 1;
  }

  .auth-shell[data-aside='right'] .auth-aside {
    transform: translate3d(calc(100% / 1.1), 0, 0);
  }

  .auth-shell[data-aside='right'] .auth-main {
    transform: translate3d(-110%, 0, 0);
  }

  /*
   * Durante a troca o painel atravessa só preto; ao chegar do outro lado a imagem aparece.
   * Dois nomes de keyframes iguais: trocar o nome reinicia a animação a cada mudança de lado.
   */
  .auth-shell[data-aside='left'] .auth-aside > * {
    animation: auth-aside-reveal-l calc(var(--dur-slow) + var(--dur-base)) var(--ease-out) backwards;
  }

  .auth-shell[data-aside='right'] .auth-aside > * {
    animation: auth-aside-reveal-r calc(var(--dur-slow) + var(--dur-base)) var(--ease-out) backwards;
  }
}

@keyframes auth-aside-reveal-l {
  0%,
  59% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes auth-aside-reveal-r {
  0%,
  59% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

/* Troca entre telas de acesso: a que sai e a que entra ocupam a mesma célula e deslizam juntas. */
.auth-stage {
  display: grid;
}

.auth-stage > * {
  grid-area: 1 / 1;
  min-width: 0;
}

.auth-slide-enter-active {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}

.auth-slide-leave-active {
  pointer-events: none;
  transition:
    opacity var(--dur-base-exit) var(--ease-in),
    transform var(--dur-slow-exit) var(--ease-in);
}

.auth-slide-enter-from {
  opacity: 0;
  transform: translate3d(calc(var(--auth-dir, 1) * var(--motion-slide)), 0, 0);
}

.auth-slide-leave-to {
  opacity: 0;
  transform: translate3d(calc(var(--auth-dir, 1) * var(--motion-slide) * -1), 0, 0)
    scale(var(--motion-scale));
}

/* Título, botões sociais, campos e links entram em sequência curta (reaplicado ao voltar do cache). */
@keyframes auth-item-in {
  from {
    opacity: 0;
    transform: translate3d(calc(var(--auth-dir, 1) * var(--motion-slide) / 3), 0, 0);
  }
}

.auth-view > :not(form),
.auth-view form > * {
  animation: auth-item-in var(--dur-slow) var(--ease-out) backwards;
}

.auth-view > :nth-child(2),
.auth-view form > :nth-child(1) {
  animation-delay: 40ms;
}
.auth-view form > :nth-child(2) {
  animation-delay: 70ms;
}
.auth-view form > :nth-child(3) {
  animation-delay: 100ms;
}
.auth-view form > :nth-child(4) {
  animation-delay: 130ms;
}
.auth-view form > :nth-child(n + 5),
.auth-view > :nth-child(n + 3) {
  animation-delay: 160ms;
}

/* painel decorativo: a frase e os destaques aparecem uma vez, ao abrir a área de acesso */
.auth-aside-copy > * {
  animation: ui-rise var(--dur-slow) var(--ease-out) backwards;
}
.auth-aside-copy > :nth-child(2) {
  animation-delay: 60ms;
}
.auth-aside-copy > :nth-child(3) {
  animation-delay: 120ms;
}
.auth-aside-copy > :nth-child(4) {
  animation-delay: 180ms;
}
</style>

<script setup lang="ts">
import { ChartNoAxesColumn, Moon, Sun, Users, Zap } from '@lucide/vue'
import { useTheme } from '@/app/composables/useTheme'
import { UiIcon, UiIconButton } from '@/shared/components'

/** Moldura das telas de acesso e do onboarding: painel de imagem fixo à esquerda, conteúdo à direita. */
const { isDark, toggleTheme } = useTheme()
const image = `${import.meta.env.BASE_URL}aside-direita.png`

const FEATURES = [
  { icon: Users, title: 'Equipes', text: 'mais produtivas' },
  { icon: Zap, title: 'Projetos', text: 'mais organizados' },
  { icon: ChartNoAxesColumn, title: 'Resultados', text: 'mais consistentes' },
]
</script>

<template>
  <div class="grid min-h-dvh bg-bg text-fg lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
    <!-- o painel é sempre escuro, independente do tema -->
    <aside
      class="dark sticky top-0 hidden h-dvh flex-col justify-between overflow-hidden bg-black p-10 text-fg lg:flex xl:p-12"
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

      <div class="relative max-w-lg">
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

    <main class="flex min-h-dvh min-w-0 flex-col px-4 py-5 sm:px-10">
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

      <div class="flex flex-1 items-center justify-center py-10">
        <div class="w-full max-w-100">
          <!-- telas de acesso usam as rotas filhas; o onboarding passa o próprio conteúdo -->
          <slot>
            <RouterView v-slot="{ Component, route }">
              <Transition name="page" mode="out-in" appear>
                <component :is="Component" :key="route.path" />
              </Transition>
            </RouterView>
          </slot>
        </div>
      </div>

      <footer class="text-12 text-fg-muted">© 2026 Inceptum</footer>
    </main>
  </div>
</template>

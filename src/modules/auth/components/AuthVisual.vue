<script setup lang="ts">
import { CalendarCheck, Trophy, Users } from '@lucide/vue'
import { computed } from 'vue'
import { UiIcon } from '@/shared/components'
import AuthEdge from './AuthEdge.vue'

/**
 * Painel institucional das telas de acesso: foto do escritório, camada escura para leitura,
 * a borda curva iluminada que o separa do formulário, a frase e os destaques da marca.
 * `side` diz de que lado o formulário está; a curva e o texto acompanham.
 */
export type AuthScene = 'executive' | 'workstation' | 'boardroom'

const { scene = 'executive', side = 'right' } = defineProps<{
  scene?: AuthScene
  /** lado em que o formulário fica (a borda curva fica desse lado do painel) */
  side?: 'left' | 'right'
}>()

const base = import.meta.env.BASE_URL
const SCENES: Record<AuthScene, { position: string; message: [string, string] }> = {
  executive: { position: '35% 50%', message: ['Organização hoje,', 'grandes conquistas amanhã.'] },
  workstation: { position: '60% 50%', message: ['Projetos em ordem,', 'equipes em movimento.'] },
  boardroom: { position: '55% 50%', message: ['Recupere o acesso', 'e continue evoluindo.'] },
}
const current = computed(() => SCENES[scene])

const FEATURES = [
  { icon: CalendarCheck, text: 'Projetos mais organizados' },
  { icon: Users, text: 'Equipes mais produtivas' },
  { icon: Trophy, text: 'Resultados mais consistentes' },
]
</script>

<template>
  <section class="auth-visual relative isolate overflow-hidden bg-black" :data-side="side">
    <Transition name="auth-scene">
      <picture :key="scene">
        <source
          media="(max-width: 1023px)"
          :srcset="`${base}images/office-${scene}-sm.webp`"
          type="image/webp"
        />
        <img
          :src="`${base}images/office-${scene}.webp`"
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchpriority="high"
          class="auth-visual-image absolute inset-0 -z-10 size-full object-cover"
          :style="{ objectPosition: current.position }"
        />
      </picture>
    </Transition>
    <!-- leitura: escurece a base e o lado do formulário; a luz do pôr do sol continua visível -->
    <div class="auth-visual-shade absolute inset-0 -z-10" aria-hidden="true" />

    <!-- borda orgânica iluminada entre a foto e o painel preto (só no desktop) -->
    <AuthEdge class="absolute inset-y-0 hidden h-full lg:block" />

    <div class="auth-visual-copy relative hidden h-full flex-col justify-end p-10 lg:flex xl:p-14">
      <!-- formulário à direita: frase à esquerda; formulário à esquerda: destaques à direita -->
      <div v-if="side === 'right'" class="max-w-md">
        <span class="mb-5 block h-0.5 w-8 rounded-full bg-accent" aria-hidden="true" />
        <p class="text-24 leading-snug font-semibold tracking-[-0.01em] text-white">
          {{ current.message[0] }}<br />{{ current.message[1] }}
        </p>
        <ul
          class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-13 text-white/80"
          aria-label="Por que usar o Urban Organization"
        >
          <li v-for="feature in FEATURES" :key="feature.text" class="flex items-center gap-2">
            <UiIcon :icon="feature.icon" :size="14" class="text-accent" />
            {{ feature.text }}
          </li>
        </ul>
      </div>
      <div v-else class="flex justify-end">
        <ul class="grid gap-3" aria-label="Por que usar o Urban Organization">
          <li
            v-for="feature in FEATURES"
            :key="feature.text"
            class="auth-feature flex items-center gap-3 text-14 text-white/90"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-control border border-accent/60 bg-black/50 text-accent backdrop-blur-sm"
              aria-hidden="true"
            >
              <UiIcon :icon="feature.icon" :size="16" />
            </span>
            {{ feature.text }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style>
.auth-visual-shade {
  background:
    linear-gradient(to top, rgb(0 0 0 / 0.85), rgb(0 0 0 / 0.15) 45%, rgb(0 0 0 / 0.05)),
    radial-gradient(120% 80% at 50% 110%, rgb(0 0 0 / 0.6), transparent 60%);
}

/* a curva fica do lado do formulário; com o formulário à esquerda ela é espelhada */
.auth-visual[data-side='right'] .auth-edge {
  right: -1px;
}

.auth-visual[data-side='left'] .auth-edge {
  left: -1px;
  transform: scaleX(-1);
}

/* troca de foto sem mudar de lado (ex.: entrar -> esqueci a senha): as duas se cruzam */
.auth-scene-enter-active,
.auth-scene-leave-active {
  transition: opacity 600ms var(--ease-in-out);
}

.auth-scene-enter-from,
.auth-scene-leave-to {
  opacity: 0;
}

/* no celular a foto vira uma faixa no topo que se dissolve no preto do formulário */
@media (max-width: 1023px) {
  .auth-visual {
    height: clamp(160px, 30vh, 260px);
    mask-image: linear-gradient(to bottom, #000 55%, transparent);
  }
}
</style>

<script setup lang="ts">
import AuthEdge from './AuthEdge.vue'

/**
 * Painel institucional das telas de acesso: só a foto do escritório e a borda curva iluminada
 * que o separa do formulário. `side` diz de que lado o formulário está; a curva acompanha.
 */
export type AuthScene = 'executive' | 'workstation' | 'boardroom'

const { scene = 'executive', side = 'right' } = defineProps<{
  scene?: AuthScene
  /** lado em que o formulário fica (a borda curva fica desse lado do painel) */
  side?: 'left' | 'right'
}>()

const base = import.meta.env.BASE_URL
const POSITIONS: Record<AuthScene, string> = {
  executive: '35% 50%',
  workstation: '60% 50%',
  boardroom: '55% 50%',
}
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
          :style="{ objectPosition: POSITIONS[scene] }"
        />
      </picture>
    </Transition>
    <!-- borda orgânica iluminada entre a foto e o painel preto (só no desktop) -->
    <AuthEdge class="absolute inset-y-0 hidden h-full lg:block" />
  </section>
</template>

<style>
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

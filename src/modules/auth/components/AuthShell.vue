<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BrandLogo } from '@/shared/components'
import AuthVisual from './AuthVisual.vue'

/**
 * Moldura das telas de acesso e do onboarding, sempre no tema escuro da marca:
 * painel institucional (60%) com a foto do escritório e painel preto (40%) com o formulário.
 * No cadastro a composição inverte: formulário à esquerda, foto à direita.
 */
const route = useRoute()

const formLeft = computed(() => Boolean(route.meta.authAsideRight))
const scene = computed(() => route.meta.authScene ?? 'executive')

// entrar e criar conta ficam em cache: alternar entre elas não apaga o que já foi digitado
const KEEP = ['LoginView', 'RegisterView']
</script>

<template>
  <div
    :data-form="formLeft ? 'left' : 'right'"
    class="auth-shell dark relative flex min-h-dvh flex-col overflow-x-clip bg-black text-fg lg:grid lg:h-dvh lg:overflow-hidden"
  >
    <AuthVisual
      class="auth-shell-visual lg:h-dvh"
      :scene="scene"
      :side="formLeft ? 'left' : 'right'"
    />

    <main
      class="auth-panel relative flex min-w-0 flex-1 flex-col bg-black lg:h-dvh lg:overflow-y-auto"
    >
      <div
        class="mx-auto flex w-full max-w-[400px] flex-1 flex-col px-5 pt-2 pb-8 sm:px-8 lg:max-w-[420px] lg:justify-center lg:py-12"
      >
        <RouterLink
          to="/entrar"
          class="auth-logo mx-auto mb-8 block w-36 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent max-lg:-mt-16 max-lg:w-32 lg:mb-10"
          aria-label="Urban Organization"
        >
          <BrandLogo on="dark" class="w-full" />
        </RouterLink>

        <div class="auth-stage">
          <!-- telas de acesso usam as rotas filhas; o onboarding passa o próprio conteúdo -->
          <slot>
            <RouterView v-slot="{ Component, route: current }">
              <Transition name="auth-swap" appear>
                <KeepAlive :include="KEEP">
                  <component :is="Component" :key="current.path" class="auth-view" />
                </KeepAlive>
              </Transition>
            </RouterView>
          </slot>
        </div>
      </div>

      <footer class="pb-5 text-center text-12 text-fg-muted">© 2026 Urban Organization</footer>
    </main>
  </div>
</template>

<style>
/* 60% foto, 40% formulário; no cadastro o formulário vem primeiro */
@media (min-width: 64rem) {
  .auth-shell[data-form='right'] {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }

  .auth-shell[data-form='left'] {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  }

  .auth-shell[data-form='left'] .auth-panel {
    order: -1;
  }
}

.auth-stage {
  display: grid;
}

.auth-stage > * {
  grid-area: 1 / 1;
  min-width: 0;
}

.auth-swap-enter-active {
  transition: opacity var(--dur-slow) var(--ease-out);
}

.auth-swap-leave-active {
  pointer-events: none;
  transition: opacity var(--dur-base-exit) var(--ease-in);
}

.auth-swap-enter-from,
.auth-swap-leave-to {
  opacity: 0;
}

/* Título, botões sociais, campos e links entram em sequência curta (reaplicado ao voltar do cache). */
@keyframes auth-item-in {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }
}

.auth-view > :not(form),
.auth-view form > * {
  animation: auth-item-in 420ms var(--ease-out) backwards;
}

.auth-view > :nth-child(2),
.auth-view form > :nth-child(1) {
  animation-delay: 50ms;
}
.auth-view form > :nth-child(2) {
  animation-delay: 90ms;
}
.auth-view form > :nth-child(3) {
  animation-delay: 130ms;
}
.auth-view form > :nth-child(4) {
  animation-delay: 170ms;
}
.auth-view form > :nth-child(n + 5),
.auth-view > :nth-child(n + 3) {
  animation-delay: 210ms;
}

/* a logo acende uma vez ao abrir a área de acesso */
.auth-logo {
  animation: auth-logo-in 640ms var(--ease-out) backwards;
}

@keyframes auth-logo-in {
  from {
    opacity: 0;
    filter: drop-shadow(0 0 0 transparent) brightness(0.6);
    transform: translate3d(0, 6px, 0) scale(0.96);
  }
  60% {
    filter: drop-shadow(0 0 18px rgb(249 159 17 / 0.45));
  }
}
</style>

<style>
/* Botões sociais (Google, GitHub): contorno com reflexo laranja, seta que avança no hover. */
.auth-social {
  position: relative;
  display: flex;
  height: 3rem;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  border-radius: var(--radius-control);
  border: 1px solid rgb(249 159 17 / 0.35);
  background: rgb(255 255 255 / 0.02);
  padding-inline: 1rem;
  font-size: var(--text-14);
  font-weight: 500;
  color: var(--ds-fg);
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out),
    scale var(--dur-instant) var(--ease-out);
}

.auth-social:hover:not(:disabled),
.auth-social:focus-within {
  border-color: var(--ds-accent);
  background: rgb(249 159 17 / 0.06);
  box-shadow: 0 0 0 4px rgb(249 159 17 / 0.08);
}

.auth-social:active:not(:disabled) {
  scale: 0.99;
}

.auth-social:focus-visible {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}

.auth-social:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.auth-social-arrow {
  color: var(--ds-fg-muted);
  transition:
    transform var(--dur-base) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.auth-social:hover .auth-social-arrow {
  color: var(--ds-accent);
  transform: translateX(3px);
}

/* Campos das telas de acesso: preto profundo, borda discreta, foco com brilho laranja. */
.auth-shell input:not([type='checkbox']) {
  background-color: rgb(255 255 255 / 0.03);
}

.auth-shell input:focus-visible {
  box-shadow: 0 0 0 4px rgb(249 159 17 / 0.12);
}

/* Checkbox marcado em laranja, com o check preto. */
.auth-shell input[type='checkbox']:checked {
  border-color: var(--ds-accent);
  background-color: var(--ds-accent);
}

.auth-shell input[type='checkbox']:checked ~ svg {
  color: var(--ds-accent-fg);
}

/* Botão principal com reflexo: a luz atravessa uma vez no hover. */
.auth-shell [data-ui='button'].bg-accent {
  overflow: hidden;
  box-shadow: 0 8px 24px -12px rgb(249 159 17 / 0.6);
}

.auth-shell [data-ui='button'].bg-accent::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 35%,
    rgb(255 255 255 / 0.35) 50%,
    transparent 65%
  );
  transform: translateX(-120%);
  pointer-events: none;
}

.auth-shell [data-ui='button'].bg-accent:hover:not(:disabled)::after {
  transform: translateX(120%);
  transition: transform 700ms var(--ease-out);
}

.auth-cta {
  border-radius: 4px;
  font-weight: 500;
  color: var(--ds-accent);
  text-decoration: underline;
  text-decoration-color: rgb(249 159 17 / 0.4);
  text-underline-offset: 4px;
  transition: text-decoration-color var(--dur-fast) var(--ease-out);
}

.auth-cta:hover {
  text-decoration-color: var(--ds-accent);
}

.auth-cta:focus-visible {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}
</style>

<style>
/* Erro do formulário: entra de cima e balança uma vez para chamar a atenção. */
.auth-feedback-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}

.auth-feedback-leave-active {
  transition: opacity var(--dur-fast-exit) var(--ease-in);
}

.auth-feedback-enter-from {
  opacity: 0;
  transform: translate3d(0, -4px, 0);
}

.auth-feedback-leave-to {
  opacity: 0;
}

.auth-error {
  animation: auth-shake 360ms var(--ease-out) 120ms;
}

@keyframes auth-shake {
  25% {
    transform: translateX(-4px);
  }
  50% {
    transform: translateX(3px);
  }
  75% {
    transform: translateX(-2px);
  }
}
</style>

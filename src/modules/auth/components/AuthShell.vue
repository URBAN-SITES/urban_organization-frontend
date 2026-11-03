<script setup lang="ts">
import { nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { BrandLogo } from '@/shared/components'
import AuthEdge from './AuthEdge.vue'
import AuthVisual from './AuthVisual.vue'

/**
 * Moldura das telas de acesso e do onboarding, sempre no tema escuro da marca:
 * painel institucional (60%) com a foto do escritório e painel preto (40%) com o formulário.
 * No cadastro e na recuperação de senha a composição inverte: formulário à esquerda, foto à direita.
 *
 * Trocar de lado (entrar <-> criar conta ou esqueci a senha) passa por uma cortina preta: ela nasce da borda curva,
 * cobre a composição atual, a troca acontece por baixo e a cortina recua revelando a nova.
 * No celular a cortina sobe de baixo para cima; com movimento reduzido vira só um esmaecer.
 */
const route = useRoute()
const router = useRouter()

// a composição desenhada só muda quando a cortina cobre a tela, não no instante da navegação
const composition = reactive({
  formLeft: Boolean(route.meta.authAsideRight),
  scene: route.meta.authScene ?? 'executive',
})

const busy = ref(false)
const leaving = ref(false)
const curtainOn = ref(false)
// a foto nova assenta devagar enquanto a cortina recua
const revealing = ref(false)
// troca instantânea do conteúdo enquanto a cortina cobre; esmaecer curto no resto
const swapName = ref('auth-swap')
const enterDelay = ref('0ms')

const visual = useTemplateRef<InstanceType<typeof AuthVisual>>('visual')
const curtain = useTemplateRef<HTMLDivElement>('curtain')

// a cortina atravessa num só movimento: cobrir acelera e revelar sai na mesma velocidade,
// então não há parada no meio (inclinações 3 e 4 compensam as durações diferentes)
const COVER_MS = 560
const REVEAL_MS = 760
const COVER_EASE = 'cubic-bezier(0.45, 0, 0.85, 0.55)'
const REVEAL_EASE = 'cubic-bezier(0.1, 0.4, 0.3, 1)'

watch(
  () => route.fullPath,
  () => {
    if (busy.value) return
    composition.formLeft = Boolean(route.meta.authAsideRight)
    composition.scene = route.meta.authScene ?? 'executive'
  },
)

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isDesktop = () => window.matchMedia('(min-width: 64rem)').matches

/** Deslocamento em que a ponta da cortina coincide com a borda curva da composição atual. */
function edgeOffset(): number {
  const el = visual.value?.$el as HTMLElement | undefined
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  return composition.formLeft ? rect.left - window.innerWidth : rect.right
}

function slide(from: string, to: string, duration: number, easing: string) {
  const el = curtain.value
  if (!el) return Promise.resolve()
  const axis = isDesktop() ? 'X' : 'Y'
  return el
    .animate(
      [{ transform: `translate${axis}(${from})` }, { transform: `translate${axis}(${to})` }],
      { duration, easing, fill: 'forwards' },
    )
    .finished.then(() => undefined)
}

async function cover() {
  curtainOn.value = true
  leaving.value = true
  await nextTick()
  if (isDesktop()) await slide(`${edgeOffset()}px`, '0px', COVER_MS, COVER_EASE)
  else await slide('100%', '0%', COVER_MS, COVER_EASE)
}

async function reveal() {
  // a troca de conteúdo aconteceu por baixo da cortina; os itens novos entram enquanto ela recua
  leaving.value = false
  revealing.value = true
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(resolve))
  window.scrollTo(0, 0)
  if (isDesktop()) await slide('0px', `${edgeOffset()}px`, REVEAL_MS, REVEAL_EASE)
  else await slide('0%', '-100%', REVEAL_MS, REVEAL_EASE)
  curtain.value?.getAnimations().forEach((animation) => animation.cancel())
  curtainOn.value = false
  revealing.value = false
  swapName.value = 'auth-swap'
  busy.value = false
}

onBeforeRouteUpdate(async (to) => {
  // uma transição por vez: cliques repetidos durante a cortina são ignorados
  if (busy.value) return false
  const toLeft = Boolean(to.meta.authAsideRight)
  if (toLeft === composition.formLeft || reducedMotion()) {
    enterDelay.value = '0ms'
    return true
  }
  busy.value = true
  swapName.value = 'auth-cut'
  enterDelay.value = '360ms'
  await cover()
  const stop = router.afterEach((next, _from, failure) => {
    stop()
    if (!failure) {
      composition.formLeft = Boolean(next.meta.authAsideRight)
      composition.scene = next.meta.authScene ?? 'executive'
    }
    void reveal()
  })
  return true
})

// entrar e criar conta ficam em cache: alternar entre elas não apaga o que já foi digitado
const KEEP = ['LoginView', 'RegisterView']
</script>

<template>
  <div
    :data-form="composition.formLeft ? 'left' : 'right'"
    class="auth-shell dark relative isolate flex min-h-dvh flex-col overflow-x-clip bg-black text-fg lg:grid lg:h-dvh lg:overflow-hidden"
    :aria-busy="busy"
  >
    <AuthVisual
      ref="visual"
      class="auth-shell-visual lg:h-dvh"
      :class="{ 'is-revealing': revealing }"
      :scene="composition.scene"
      :side="composition.formLeft ? 'left' : 'right'"
    />

    <!-- cortina da troca entre entrar e criar conta; a ponta é a mesma borda curva do painel -->
    <div
      v-show="curtainOn"
      ref="curtain"
      class="auth-curtain"
      :data-cap="composition.formLeft ? 'right' : 'left'"
      aria-hidden="true"
    >
      <AuthEdge class="auth-curtain-cap" />
    </div>

    <main
      class="auth-panel relative flex min-w-0 flex-1 flex-col bg-black lg:h-dvh lg:overflow-y-auto"
      :class="{ 'is-leaving': leaving }"
      :inert="busy"
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

        <div class="auth-stage" :style="{ '--auth-enter-delay': enterDelay }">
          <!-- telas de acesso usam as rotas filhas; o onboarding passa o próprio conteúdo -->
          <slot>
            <RouterView v-slot="{ Component, route: current }">
              <Transition :name="swapName" appear>
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
.auth-shell {
  --auth-edge-width: clamp(96px, 10vw, 168px);
}

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

/* a foto fica embaixo, a cortina no meio e o painel do formulário por cima dela */
.auth-panel {
  z-index: 2;
  transition: opacity 520ms var(--ease-out);
}

.auth-panel.is-leaving {
  opacity: 0;
  transition: opacity 420ms var(--ease-in-out);
}

.auth-shell-visual.is-revealing img {
  animation: auth-photo-settle 760ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes auth-photo-settle {
  from {
    opacity: 0.7;
    transform: scale(1.04);
  }
}

.auth-curtain {
  position: fixed;
  inset: 0;
  z-index: 1;
  background: #000;
  pointer-events: none;
  will-change: transform;
}

.auth-curtain-cap {
  position: absolute;
  inset-block: 0;
  height: 100%;
}

.auth-curtain[data-cap='left'] .auth-curtain-cap {
  right: calc(100% - 1px);
}

.auth-curtain[data-cap='right'] .auth-curtain-cap {
  left: calc(100% - 1px);
  transform: scaleX(-1);
}

/* no celular a cortina sobe por cima de tudo, com a linha laranja nas bordas */
@media (max-width: 63.999rem) {
  .auth-curtain {
    z-index: 3;
    box-shadow:
      0 -1px 0 var(--ds-accent),
      0 -10px 28px -6px rgb(249 159 17 / 0.45),
      0 1px 0 var(--ds-accent),
      0 10px 28px -6px rgb(249 159 17 / 0.45);
  }

  .auth-curtain-cap {
    display: none;
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
  animation: auth-item-in 560ms var(--ease-out) backwards;
  animation-delay: var(--auth-enter-delay, 0ms);
}

.auth-view > :nth-child(2),
.auth-view form > :nth-child(1) {
  animation-delay: calc(var(--auth-enter-delay, 0ms) + 50ms);
}
.auth-view form > :nth-child(2) {
  animation-delay: calc(var(--auth-enter-delay, 0ms) + 90ms);
}
.auth-view form > :nth-child(3) {
  animation-delay: calc(var(--auth-enter-delay, 0ms) + 130ms);
}
.auth-view form > :nth-child(4) {
  animation-delay: calc(var(--auth-enter-delay, 0ms) + 170ms);
}
.auth-view form > :nth-child(n + 5),
.auth-view > :nth-child(n + 3) {
  animation-delay: calc(var(--auth-enter-delay, 0ms) + 210ms);
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
  --sweep: rgb(249 159 17 / 0.08);
  position: relative;
  display: flex;
  height: 2.75rem;
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

/* Campos das telas de acesso: preto profundo e borda discreta; o foco (borda e halo laranja)
   e o erro vêm do UiInput; o preenchimento do hover está mais abaixo. */
.auth-shell input:not([type='checkbox']) {
  background-color: rgb(255 255 255 / 0.03);
}

/* preenchimento automático do navegador sem o fundo claro que quebra o tema escuro */
.auth-shell input:-webkit-autofill {
  -webkit-text-fill-color: var(--ds-fg);
  caret-color: var(--ds-fg);
  transition:
    background-color 99999s,
    border-color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}

/* Checkbox marcado em laranja, com o check preto. */
.auth-shell input[type='checkbox']:checked {
  border-color: var(--ds-accent);
  background-color: var(--ds-accent);
}

.auth-shell input[type='checkbox']:checked ~ svg {
  color: var(--ds-accent-fg);
}

/*
 * Hover das telas de acesso. Botões (UiButton), links (.ui-link) e o contorno dos campos usam
 * as regras globais de assets/interactions.css; aqui ficam só os ajustes destas telas:
 * a cor do preenchimento dos botões sociais (--sweep, acima) e o dos campos translúcidos.
 */
.auth-shell [data-ui='input'] {
  isolation: isolate;
}

.auth-shell [data-ui='input']::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  content: '';
  background: rgb(255 255 255 / 0.06);
  pointer-events: none;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--dur-draw) var(--ease-draw);
}

.auth-shell [data-ui='input']:hover:has(input:not(:disabled))::before,
.auth-shell [data-ui='input']:focus-within::before {
  transform: scaleX(1);
}

/* links de destaque: laranja, com um traço apagado em repouso que a linha cobre no hover */
.auth-cta {
  --link-track: rgb(249 159 17 / 0.35);
  border-radius: 4px;
  font-weight: 500;
  color: var(--ds-accent);
}

.auth-cta:focus-visible {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .auth-shell [data-ui='input']::before {
    transition: none;
  }
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

<script setup lang="ts">
import { computed, type Component } from 'vue'
import TopbarComp from './topbarComp.vue'

/* COMO USAR:
  <PageLayout :crumbs="['Conta', 'Planos']" title="Planos" description="..." :icon="CreditCard">
    <template #actions><UiButton>...</UiButton></template>
    conteúdo
  </PageLayout>
  Molde único das telas internas: topbar, cabeçalho sobre a foto do escritório (título,
  descrição e ações, como no Início e no quadro) e o conteúdo logo abaixo.
  `width`: narrow (leitura), default, wide (tabelas e grades) ou full.
  `icon` e `tone` montam o bloco colorido ao lado do título; `cover` escolhe a foto.
*/

type Cover = 'executive' | 'workstation' | 'boardroom'

const {
  crumbs,
  title = '',
  description = '',
  width = 'default',
  showSearch = false,
  searchPlaceholder,
  icon,
  tone = '#f99f11',
  cover,
} = defineProps<{
  crumbs: string[]
  title?: string
  description?: string
  width?: 'narrow' | 'default' | 'wide' | 'full'
  showSearch?: boolean
  searchPlaceholder?: string
  icon?: Component
  /** cor do bloco do ícone */
  tone?: string
  cover?: Cover
}>()

const search = defineModel<string>('search', { default: '' })

const WIDTHS = {
  narrow: 'max-w-3xl',
  default: 'max-w-4xl',
  wide: 'max-w-6xl',
  full: '',
} as const

const COVERS: Cover[] = ['boardroom', 'executive', 'workstation']
// sem `cover`, cada seção fica sempre com a mesma foto (escolhida pelo primeiro trecho do caminho)
const photo = computed(() => {
  if (cover) return cover
  const key = crumbs[0] ?? title
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return COVERS[hash % COVERS.length]!
})
</script>

<template>
  <div class="page-shell flex min-h-dvh w-full min-w-0 flex-col bg-bg text-fg">
    <TopbarComp
      v-model:search="search"
      :crumbs="crumbs"
      :show-search="showSearch"
      :search-placeholder="searchPlaceholder"
    />

    <!-- a foto fica sempre escura (classe dark), nos dois temas, como no Início -->
    <section v-if="title || $slots.title || $slots.actions" class="page-stage dark">
      <img
        class="page-stage-media"
        :src="`/images/office-${photo}.webp`"
        :srcset="`/images/office-${photo}-sm.webp 960w, /images/office-${photo}.webp 1920w`"
        sizes="100vw"
        alt=""
        decoding="async"
      />
      <header
        :class="[
          'ui-rise mx-auto flex w-full min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-4 px-4 pt-8 pb-8 sm:px-8 sm:pt-10',
          WIDTHS[width],
        ]"
      >
        <div class="flex min-w-0 items-center gap-4">
          <span v-if="icon" class="uo-tile" :style="{ '--tile': tone }" aria-hidden="true">
            <component :is="icon" :size="22" :stroke-width="2" />
          </span>
          <div class="min-w-0">
            <h1
              class="text-24 leading-tight font-semibold tracking-[-0.02em] text-white sm:text-[30px] sm:leading-[38px]"
            >
              <slot name="title">{{ title }}</slot>
            </h1>
            <p
              v-if="description || $slots.description"
              class="mt-1 max-w-2xl text-14 text-white/70"
            >
              <slot name="description">{{ description }}</slot>
            </p>
          </div>
        </div>
        <div v-if="$slots.actions" class="page-stage-actions flex flex-wrap items-center gap-2">
          <slot name="actions" />
        </div>
      </header>
    </section>

    <main
      :class="[
        'page-content mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 px-4 pb-10 sm:px-8',
        title || $slots.title || $slots.actions ? 'pt-1' : 'pt-6',
        WIDTHS[width],
      ]"
    >
      <slot name="top" />
      <slot />
    </main>
  </div>
</template>

<style>
/* guarda o fundo da página antes do .dark do topo, para a foto se dissolver nele */
.page-shell {
  --page-fade: var(--ds-bg);
}

.page-stage {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  color: #ffffff;
}

.page-stage-media {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 50%;
  animation: uo-hero-settle 1.4s var(--ease-out) both;
}

.page-stage::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  content: '';
  background:
    radial-gradient(50% 100% at 90% 0%, rgb(249 159 17 / 0.16), transparent 60%),
    linear-gradient(90deg, rgb(0 0 0 / 0.88) 0%, rgb(0 0 0 / 0.62) 50%, rgb(0 0 0 / 0.38) 100%),
    linear-gradient(180deg, transparent 35%, var(--page-fade) 100%);
}

/* ações do cabeçalho viram vidro sobre a foto (botões secundários e de ícone) */
.page-stage.dark {
  --ds-surface-1: rgb(0 0 0 / 0.35);
  --ds-surface-2: rgb(255 255 255 / 0.1);
  --ds-border: rgb(255 255 255 / 0.14);
  --ds-border-strong: rgb(255 255 255 / 0.28);
}

.page-stage-actions :is(button, a, [role='button']) {
  backdrop-filter: blur(10px);
}

/* entrada: depois do cabeçalho, os blocos do conteúdo sobem em sequência curta */
.page-content > * {
  animation: ui-rise var(--dur-slow) var(--ease-out) 60ms backwards;
}

.page-content > :nth-child(2) {
  animation-delay: 110ms;
}

.page-content > :nth-child(3) {
  animation-delay: 160ms;
}

.page-content > :nth-child(n + 4) {
  animation-delay: 210ms;
}

@media (prefers-reduced-motion: reduce) {
  .page-stage-media {
    animation: none;
  }
}
</style>

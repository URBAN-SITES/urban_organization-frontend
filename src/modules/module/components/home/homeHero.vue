<script setup lang="ts">
import { CalendarDays, CircleAlert, FolderKanban, Search } from '@lucide/vue'
import { useShell } from '@/shared/composables/shell'
import type { Dashboard } from '../../types'

/**
 * Topo do início: a foto do escritório do login ocupa a largura toda, por trás da saudação e
 * dos indicadores (slot), e se dissolve no preto da página. Os números vêm do dashboard real.
 */
defineProps<{
  greeting: string
  dateLabel: string
  data: Dashboard | null
  projectsTo: string
}>()

const shell = useShell()
</script>

<template>
  <section class="home-stage" aria-labelledby="home-greeting">
    <img
      class="home-stage-media"
      src="/images/office-executive.webp"
      srcset="/images/office-executive-sm.webp 960w, /images/office-executive.webp 1920w"
      sizes="100vw"
      alt=""
      decoding="async"
      fetchpriority="high"
    />
    <div class="home-container relative flex flex-col gap-7 pt-8 pb-2 sm:pt-12">
      <slot name="top" />
      <div class="ui-rise flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div class="max-w-xl">
          <p class="text-12 font-medium tracking-[0.12em] text-[#f99f11] uppercase">
            {{ dateLabel }}
          </p>
          <h1
            id="home-greeting"
            class="mt-2 text-32 leading-tight font-semibold tracking-[-0.02em] text-white sm:text-[40px] sm:leading-[48px]"
          >
            {{ greeting }}
          </h1>
          <p class="mt-2 text-14 text-white/70 sm:text-16">
            <template v-if="!data">Preparando o seu resumo do dia…</template>
            <template v-else-if="data.open_tasks">
              {{ data.open_tasks }}
              {{ data.open_tasks === 1 ? 'tarefa aberta' : 'tarefas abertas' }} com você<template
                v-if="data.due_this_week"
              >
                · {{ data.due_this_week }} com prazo nesta semana</template
              >.
            </template>
            <template v-else>Organize suas ideias e transforme projetos em resultados.</template>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span
            v-if="data?.overdue"
            class="inline-flex h-9 items-center gap-2 rounded-full border border-[#f26b6b]/30 bg-[#f26b6b]/12 px-3.5 text-13 text-[#ffb4b4] backdrop-blur"
          >
            <CircleAlert :size="16" aria-hidden="true" />
            {{ data.overdue }} {{ data.overdue === 1 ? 'atrasada' : 'atrasadas' }}
          </span>
          <RouterLink :to="projectsTo" class="hero-action">
            <FolderKanban :size="16" aria-hidden="true" />
            Projetos
          </RouterLink>
          <RouterLink to="/calendario" class="hero-action">
            <CalendarDays :size="16" aria-hidden="true" />
            Calendário
          </RouterLink>
          <button
            type="button"
            class="hero-action hero-action-primary"
            aria-keyshortcuts="Control+K Meta+K"
            @click="shell.openPalette()"
          >
            <Search :size="16" aria-hidden="true" />
            Buscar
          </button>
        </div>
      </div>
      <slot />
    </div>
  </section>
</template>

<style>
/* largura útil das telas do início (mesma no topo com foto e no conteúdo) */
.home-container {
  width: 100%;
  max-width: 1400px;
  margin-inline: auto;
  padding-inline: 16px;
}

@media (width >= 40rem) {
  .home-container {
    padding-inline: 32px;
  }
}

.home-stage {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

.home-stage-media {
  position: absolute;
  inset: 0 0 auto;
  z-index: -2;
  width: 100%;
  height: min(520px, 100%);
  object-fit: cover;
  object-position: center 45%;
  animation: uo-hero-settle 1.4s var(--ease-out) both;
}

/* escurece à esquerda (texto) e dissolve a foto no fundo da página */
.home-stage::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  content: '';
  background:
    radial-gradient(60% 70% at 85% 10%, rgb(249 159 17 / 0.16), transparent 60%),
    linear-gradient(90deg, rgb(0 0 0 / 0.85) 0%, rgb(0 0 0 / 0.55) 45%, rgb(0 0 0 / 0.25) 100%),
    linear-gradient(180deg, transparent 0, transparent 200px, var(--ds-bg) min(520px, 100%));
}

.hero-action {
  display: inline-flex;
  height: 36px;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.06);
  padding-inline: 14px;
  font-size: var(--text-13);
  color: rgb(255 255 255 / 0.88);
  backdrop-filter: blur(8px);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.hero-action:hover {
  border-color: rgb(255 255 255 / 0.26);
  background: rgb(255 255 255 / 0.12);
}

.hero-action:active {
  transform: scale(0.97);
}

.hero-action:focus-visible {
  outline: 2px solid #f99f11;
  outline-offset: 2px;
}

.hero-action-primary {
  border-color: transparent;
  background: #f99f11;
  font-weight: 500;
  color: #000000;
  box-shadow: 0 8px 24px -10px rgb(249 159 17 / 0.8);
}

.hero-action-primary:hover {
  border-color: transparent;
  background: #fab13f;
}

@media (prefers-reduced-motion: reduce) {
  .home-stage-media {
    animation: none;
  }
}
</style>

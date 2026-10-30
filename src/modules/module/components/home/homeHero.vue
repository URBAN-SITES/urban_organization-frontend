<script setup lang="ts">
import { CalendarDays, CircleAlert, FolderKanban, Search } from '@lucide/vue'
import { UiSkeleton } from '@/shared/components'
import { useShell } from '@/shared/composables/shell'
import type { Dashboard } from '../../types'

/**
 * Abertura do início: a mesma foto do escritório do login, escurecida à esquerda para o texto.
 * Os números vêm do dashboard real; enquanto carrega, só a saudação aparece.
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
  <section class="uo-hero ui-rise" aria-labelledby="home-greeting">
    <img
      class="uo-hero-media"
      src="/images/office-executive.webp"
      srcset="/images/office-executive-sm.webp 960w, /images/office-executive.webp 1920w"
      sizes="(max-width: 960px) 100vw, 1200px"
      alt=""
      decoding="async"
      fetchpriority="high"
    />
    <div class="flex min-h-56 flex-col justify-between gap-8 p-6 sm:min-h-64 sm:p-8 lg:p-10">
      <div class="max-w-xl">
        <p class="text-12 font-medium tracking-[0.12em] text-[#f99f11] uppercase">
          {{ dateLabel }}
        </p>
        <h1
          id="home-greeting"
          class="mt-3 text-32 leading-tight font-semibold tracking-[-0.02em] text-white sm:text-48 sm:leading-[1.05]"
        >
          {{ greeting }}
        </h1>
        <p class="mt-3 max-w-md text-14 text-white/70 sm:text-16">
          <template v-if="!data">Preparando o seu resumo do dia…</template>
          <template v-else-if="data.open_tasks">
            Você tem {{ data.open_tasks }}
            {{ data.open_tasks === 1 ? 'tarefa aberta' : 'tarefas abertas' }}
            <template v-if="data.due_this_week">
              e {{ data.due_this_week }} com prazo nesta semana</template
            >. Bom trabalho pela frente.
          </template>
          <template v-else>Nenhuma tarefa aberta com você. Bom momento para planejar.</template>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="hero-action hero-action-primary"
          aria-keyshortcuts="Control+K Meta+K"
          @click="shell.openPalette()"
        >
          <Search :size="16" aria-hidden="true" />
          Buscar no workspace
        </button>
        <RouterLink :to="projectsTo" class="hero-action">
          <FolderKanban :size="16" aria-hidden="true" />
          Projetos
        </RouterLink>
        <RouterLink to="/calendario" class="hero-action">
          <CalendarDays :size="16" aria-hidden="true" />
          Calendário
        </RouterLink>
        <UiSkeleton v-if="!data" class="h-9 w-40 rounded-full opacity-30" />
        <span
          v-else-if="data.overdue"
          class="inline-flex h-9 items-center gap-2 rounded-full border border-[#f26b6b]/30 bg-[#f26b6b]/12 px-3.5 text-13 text-[#ffb4b4] backdrop-blur"
        >
          <CircleAlert :size="16" aria-hidden="true" />
          {{ data.overdue }} {{ data.overdue === 1 ? 'atrasada' : 'atrasadas' }}
          <span v-if="data.overdue_title" class="hidden max-w-48 truncate text-white/60 md:inline">
            · {{ data.overdue_title }}
          </span>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
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
</style>

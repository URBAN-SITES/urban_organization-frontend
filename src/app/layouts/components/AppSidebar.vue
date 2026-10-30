<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue'
import { onKeyStroke, useMediaQuery, useStorage } from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import { useSectorsStore } from '@/modules/module'
import { useOrganizationsStore } from '@/modules/organizations'
import { UiTooltip } from '@/shared/components'
import SidebarPanel from './SidebarPanel.vue'

const auth = useAuthStore()
const organizations = useOrganizationsStore()
const sectors = useSectorsStore()
const route = useRoute()

// desktop: recolhida ou não é preferência do usuário, guardada no navegador.
// tablet: fica compacta e abre por cima do conteúdo só quando pedida.
const collapsed = useStorage('inceptum:sidebar-collapsed', false)
const isTablet = useMediaQuery('(max-width: 1023.98px)')
const tabletOpen = ref(false)
const isCollapsed = computed(() => (isTablet.value ? !tabletOpen.value : collapsed.value))
const overlay = computed(() => isTablet.value && tabletOpen.value)
const toggleLabel = computed(() =>
  isCollapsed.value ? 'Expandir barra lateral' : 'Recolher barra lateral',
)

function toggle() {
  if (isTablet.value) tabletOpen.value = !tabletOpen.value
  else collapsed.value = !collapsed.value
}

watch(
  () => route.fullPath,
  () => (tabletOpen.value = false),
)
watch(isTablet, () => (tabletOpen.value = false))
onKeyStroke('Escape', () => {
  if (overlay.value) tabletOpen.value = false
})

// páginas sem guard abrem sem o usuário carregado: confere a sessão
onMounted(async () => {
  if (!auth.user) await auth.loadUser().catch(() => undefined)
  if (auth.user && !organizations.organizations.length) {
    await organizations.load().catch(() => undefined)
  }
})

// trocou de organização (ou de conta): os projetos do menu passam a ser os dela
watch(
  () => [auth.user?.id, organizations.current?.id] as const,
  ([user, id]) => {
    if (user && id) void sectors.load(id).catch(() => undefined)
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="sb-host sticky top-0 z-40 hidden h-dvh shrink-0 md:block"
    :data-collapsed="isCollapsed || undefined"
    :data-tablet="isTablet || undefined"
  >
    <Transition name="ui-fade">
      <div
        v-if="overlay"
        class="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-hidden="true"
        @click="tabletOpen = false"
      />
    </Transition>

    <aside
      class="app-sidebar dark"
      :class="{ 'is-overlay': overlay }"
      :data-collapsed="isCollapsed || undefined"
      aria-label="Barra lateral"
    >
      <SidebarPanel :collapsed="isCollapsed" />
    </aside>

    <UiTooltip :text="toggleLabel" placement="right" :delay="300" class="sb-toggle-anchor">
      <button
        type="button"
        data-ui="sidebar-toggle"
        class="sb-toggle"
        :aria-label="toggleLabel"
        :aria-expanded="!isCollapsed"
        @click="toggle"
      >
        <ChevronLeft :size="14" :stroke-width="2.25" aria-hidden="true" />
      </button>
    </UiTooltip>
  </div>
</template>

<style>
/*
 * Barra lateral na identidade das telas de entrada: preto, grafite, bordas translúcidas e o
 * laranja #F99F11 só no que importa (rota atual, avisos). Sempre escura, em qualquer tema.
 */
.sb-host,
.sb-drawer {
  --sb-bg: #0a0a0a;
  --sb-surface: #111111;
  --sb-surface-2: #18181a;
  --sb-border: rgb(255 255 255 / 0.07);
  --sb-border-strong: rgb(255 255 255 / 0.12);
  --sb-text: #d4d4d8;
  --sb-muted: #8a8a92;
  --sb-accent: #f99f11;
  --sb-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  --sb-rail: 72px;
  --sb-wide: 264px;
}

.sb-host {
  width: var(--sb-wide);
  transition: width 300ms var(--sb-ease);
}

.sb-host[data-collapsed],
.sb-host[data-tablet] {
  width: var(--sb-rail);
}

.app-sidebar {
  position: absolute;
  inset-block: 0;
  left: 0;
  display: flex;
  width: var(--sb-wide);
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--sb-border);
  /* uma luz quente bem discreta atrás da marca */
  background:
    radial-gradient(120% 40% at 0% 0%, rgb(249 159 17 / 0.07), transparent 60%), var(--sb-bg);
  color: var(--sb-text);
  transition:
    width 300ms var(--sb-ease),
    box-shadow 300ms var(--sb-ease);
}

.app-sidebar[data-collapsed] {
  width: var(--sb-rail);
}

.app-sidebar.is-overlay {
  box-shadow: 24px 0 48px -12px rgb(0 0 0 / 0.6);
}

/* botão de recolher: preso na borda, aparece com mais força ao passar o mouse na barra */
.sb-toggle-anchor {
  position: absolute;
  top: 26px;
  right: -12px;
  z-index: 2;
}

.sb-toggle {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--sb-border-strong);
  border-radius: 999px;
  background: var(--sb-surface);
  color: var(--sb-muted);
  cursor: pointer;
  opacity: 0.7;
  transition:
    opacity 160ms ease-out,
    color 160ms ease-out,
    border-color 160ms ease-out,
    box-shadow 200ms ease-out,
    scale 120ms ease-out;
}

.sb-host:hover .sb-toggle,
.sb-toggle:focus-visible {
  opacity: 1;
}

.sb-toggle:hover {
  border-color: rgb(249 159 17 / 0.6);
  color: var(--sb-accent);
  box-shadow: 0 0 0 4px rgb(249 159 17 / 0.1);
}

.sb-toggle:active {
  scale: 0.92;
}

.sb-toggle:focus-visible {
  outline: 2px solid var(--sb-accent);
  outline-offset: 2px;
}

.sb-toggle svg {
  transition: transform 300ms var(--sb-ease);
}

.sb-host[data-collapsed] .sb-toggle svg {
  transform: rotate(180deg);
}

/* ---------- marca ---------- */
.sb-header {
  position: relative;
  display: flex;
  height: 92px;
  flex-shrink: 0;
  align-items: center;
  padding-inline: 20px;
  margin-bottom: 12px;
}

.sb-header::after {
  content: '';
  position: absolute;
  inset-inline: 16px;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--sb-border-strong), transparent);
}

.sb-brand {
  position: relative;
  display: block;
  height: 64px;
  width: 96px;
  border-radius: 8px;
}

.sb-brand:focus-visible {
  outline: 2px solid var(--sb-accent);
  outline-offset: 4px;
}

.sb-brand img {
  position: absolute;
  top: 50%;
  left: 0;
  translate: 0 -50%;
  transition:
    opacity 220ms var(--sb-ease),
    transform 300ms var(--sb-ease);
}

/* proporção original da logo (258x173): 94px de largura, ~63px de altura */
.sb-brand-full {
  width: 94px;
}

.sb-brand-mark {
  width: 32px;
  border-radius: 8px;
  opacity: 0;
  transform: scale(0.8);
}

[data-collapsed] .sb-brand-full {
  opacity: 0;
  transform: scale(0.92);
}

[data-collapsed] .sb-brand-mark {
  opacity: 1;
  transform: scale(1);
}

.sb-icon-button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 10px;
  color: var(--sb-muted);
  cursor: pointer;
  transition:
    background-color 160ms ease-out,
    color 160ms ease-out;
}

.sb-icon-button:hover {
  background: rgb(255 255 255 / 0.06);
  color: #fff;
}

/* ---------- organização ---------- */
.sb-org {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  border: 1px solid var(--sb-border);
  border-radius: 12px;
  background: rgb(255 255 255 / 0.025);
  padding-inline: 9px 10px;
  cursor: pointer;
  transition:
    background-color 160ms ease-out,
    border-color 160ms ease-out,
    scale 120ms ease-out;
}

.sb-org:hover,
.sb-org.is-open {
  border-color: var(--sb-border-strong);
  background: rgb(255 255 255 / 0.05);
}

.sb-org:active {
  scale: 0.985;
}

.sb-org:focus-visible {
  outline: 2px solid var(--sb-accent);
  outline-offset: 2px;
}

.sb-org-mark {
  position: relative;
  display: grid;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 8px;
  background: linear-gradient(140deg, #2a2a2d, #151517);
  box-shadow: inset 0 0 0 1px var(--sb-border-strong);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

/* ---------- grupos ---------- */
.sb-scroll {
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 12px;
  scrollbar-width: thin;
  scrollbar-color: #2a2a2d transparent;
}

/* coluna única que encolhe: rótulos longos não alargam a barra recolhida */
.app-sidebar ul.grid {
  grid-template-columns: minmax(0, 1fr);
}

.sb-group + .sb-group {
  margin-top: 14px;
}

/* altura fixa: ao recolher o título só some, os ícones não sobem nem descem */
.sb-group-title {
  display: flex;
  height: 24px;
  align-items: center;
  margin-bottom: 2px;
  padding-inline: 12px;
  color: #6c6c74;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
}

.sb-section-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: -2px;
  border-radius: 6px;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
  transition: color 160ms ease-out;
}

.sb-section-toggle:hover {
  color: #b5b5bb;
}

.sb-section-toggle:focus-visible {
  outline: 2px solid var(--sb-accent);
  outline-offset: 2px;
}

.sb-chevron {
  transition: transform 220ms var(--sb-ease);
}

.sb-section-toggle[aria-expanded='true'] .sb-chevron {
  transform: rotate(90deg);
}

.sb-section-count {
  border-radius: 999px;
  background: rgb(255 255 255 / 0.06);
  padding: 0 6px;
  font-size: 10px;
  letter-spacing: 0;
  line-height: 16px;
}

/* abre e fecha a seção animando a altura (grid 0fr -> 1fr) */
.sb-collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 260ms var(--sb-ease),
    opacity 200ms ease-out;
}

.sb-collapse[data-open] {
  grid-template-rows: 1fr;
  opacity: 1;
}

.sb-collapse > div {
  overflow: hidden;
}

/* ---------- itens ---------- */
.sb-link,
.sb-project {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  border-radius: 10px;
  padding-inline: 15px 10px;
  color: var(--sb-text);
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
  transition:
    background-color 180ms ease-out,
    color 180ms ease-out,
    box-shadow 180ms ease-out,
    scale 120ms ease-out;
}

.sb-project {
  padding-inline: 12px 10px;
}

.sb-link:hover,
.sb-project:hover {
  background: rgb(255 255 255 / 0.05);
  color: #fff;
}

.sb-link:active,
.sb-project:active {
  scale: 0.985;
}

.sb-link:focus-visible,
.sb-project:focus-visible {
  outline: 2px solid var(--sb-accent);
  outline-offset: -2px;
}

.sb-link-icon {
  position: relative;
  display: grid;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  place-items: center;
  color: var(--sb-muted);
  transition:
    color 180ms ease-out,
    transform 220ms var(--sb-ease);
}

.sb-link:hover .sb-link-icon {
  color: #fff;
  transform: translateX(1px) scale(1.06);
}

/* rota atual: fundo laranja escuro, ícone na cor da marca, texto branco */
.sb-link[data-active] {
  background: linear-gradient(90deg, rgb(249 159 17 / 0.15), rgb(249 159 17 / 0.04) 70%);
  box-shadow: inset 0 0 0 1px rgb(249 159 17 / 0.14);
  color: #fff;
}

.sb-link[data-active] .sb-link-icon {
  color: var(--sb-accent);
  filter: drop-shadow(0 0 6px rgb(249 159 17 / 0.45));
}

.sb-indicator {
  position: absolute;
  top: 0;
  left: 3px;
  width: 3px;
  border-radius: 999px;
  background: var(--sb-accent);
  box-shadow: 0 0 10px rgb(249 159 17 / 0.7);
  transition:
    transform 340ms var(--sb-ease),
    height 340ms var(--sb-ease);
  pointer-events: none;
}

.sb-count {
  min-width: 20px;
  border-radius: 999px;
  background: var(--sb-accent);
  padding: 0 6px;
  color: #000;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  animation: sb-pop 360ms var(--sb-ease);
}

.sb-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--sb-accent);
  box-shadow: 0 0 0 2px var(--sb-bg);
  animation: sb-pop 360ms var(--sb-ease);
}

.sb-dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--sb-accent);
  animation: sb-ping 1.6s ease-out 2;
}

/* sino balança uma vez quando chega aviso novo */
.sb-ring {
  transform-origin: 50% 2px;
  animation: sb-ring 900ms var(--sb-ease);
}

@keyframes sb-pop {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
}

@keyframes sb-ping {
  to {
    opacity: 0;
    transform: scale(2.4);
  }
}

@keyframes sb-ring {
  20% {
    transform: rotate(14deg);
  }
  40% {
    transform: rotate(-10deg);
  }
  60% {
    transform: rotate(6deg);
  }
  80% {
    transform: rotate(-3deg);
  }
}

/* ---------- favoritos ---------- */
.sb-project .sb-project-mark {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--project);
  opacity: 0.55;
  transition:
    opacity 180ms ease-out,
    box-shadow 180ms ease-out;
}

.sb-project[data-current] {
  background: rgb(255 255 255 / 0.06);
  box-shadow: inset 2px 0 0 var(--project);
  color: #fff;
}

.sb-project[data-current] .sb-project-mark {
  opacity: 1;
  box-shadow: 0 0 8px var(--project);
}

.sb-project > span:first-child {
  border-color: var(--sb-border-strong);
  background: rgb(255 255 255 / 0.03);
  transition: transform 220ms var(--sb-ease);
}

.sb-project:hover > span:first-child {
  transform: scale(1.06);
}

/* muitos fixados: a lista rola em vez de empurrar o resto da barra */
.sb-favorites {
  max-height: calc(6 * 2.375rem);
  overflow-y: auto;
  scrollbar-width: none;
}

.sb-empty {
  display: flex;
  gap: 8px;
  margin-inline: 4px;
  border: 1px dashed var(--sb-border-strong);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--sb-muted);
  font-size: 12px;
  line-height: 16px;
  white-space: normal;
  transition:
    border-color 160ms ease-out,
    color 160ms ease-out;
}

.sb-empty:hover {
  border-color: rgb(249 159 17 / 0.45);
  color: #fff;
}

/* ---------- rodapé ---------- */
.sb-footer {
  display: grid;
  flex-shrink: 0;
  gap: 4px;
  border-top: 1px solid var(--sb-border);
  padding: 10px 12px 12px;
}

.sb-profile {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  border-radius: 12px;
  padding: 6px 10px 6px 8px;
  cursor: pointer;
  transition:
    background-color 160ms ease-out,
    box-shadow 160ms ease-out,
    scale 120ms ease-out;
}

.sb-profile:hover,
.sb-profile.is-open {
  background: rgb(255 255 255 / 0.05);
  box-shadow: inset 0 0 0 1px var(--sb-border);
}

.sb-profile:active {
  scale: 0.985;
}

.sb-profile:focus-visible {
  outline: 2px solid var(--sb-accent);
  outline-offset: -2px;
}

/* ---------- recolhida: rótulos somem com fade, nada muda de lugar ---------- */
.sidebar-label {
  transition:
    opacity 200ms ease-out 60ms,
    transform 220ms var(--sb-ease) 60ms,
    visibility 0s;
}

[data-collapsed] .sidebar-label {
  visibility: hidden;
  opacity: 0;
  transform: translateX(calc(-6px * var(--motion-on)));
  transition:
    opacity 120ms ease-in,
    transform 120ms ease-in,
    visibility 0s linear 120ms;
}

@media (prefers-reduced-motion: reduce) {
  .sb-host,
  .app-sidebar,
  .sb-indicator,
  .sb-collapse {
    transition: none;
  }

  .sb-ring,
  .sb-dot::after {
    animation: none;
  }
}
</style>

<script setup lang="ts">
import { onClickOutside, onKeyStroke, useMutationObserver } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import { useSectorsStore } from '@/modules/module'
import { useOrganizationsStore } from '@/modules/organizations'
import SidebarPanel from './SidebarPanel.vue'

const auth = useAuthStore()
const organizations = useOrganizationsStore()
const sectors = useSectorsStore()
const route = useRoute()

/*
 * A barra fica sempre compacta (só ícones) e abre por cima do conteúdo, sem empurrar a página:
 * - mouse: abre ao passar por cima e fecha ao sair, com um pequeno atraso para não piscar
 *   quando o cursor só cruza a barra;
 * - teclado: abre quando o foco (Tab) entra nela e fecha quando sai;
 * - toque: um toque no fundo da barra abre; tocar fora, Esc ou trocar de tela fecha;
 * - menus da organização e da conta abertos seguram a barra aberta até fecharem.
 */
const OPEN_DELAY = 110
const CLOSE_DELAY = 240

const aside = useTemplateRef<HTMLElement>('aside')
const hovering = ref(false)
const keyboardFocus = ref(false)
const touchOpen = ref(false)
const menuOpen = ref(false)
const expanded = computed(
  () => hovering.value || keyboardFocus.value || touchOpen.value || menuOpen.value,
)

let timer: ReturnType<typeof setTimeout> | undefined
function setHover(value: boolean) {
  clearTimeout(timer)
  timer = setTimeout(() => (hovering.value = value), value ? OPEN_DELAY : CLOSE_DELAY)
}
onBeforeUnmount(() => clearTimeout(timer))

function onPointerEnter(event: PointerEvent) {
  if (event.pointerType !== 'touch') setHover(true)
}
function onPointerLeave(event: PointerEvent) {
  if (event.pointerType !== 'touch') setHover(false)
}
// toque no fundo da barra (fora de links e botões) abre; nos ícones segue navegando direto
function onPointerDown(event: PointerEvent) {
  if (event.pointerType !== 'touch' || expanded.value) return
  if (!(event.target as Element).closest('a, button')) touchOpen.value = true
}
onClickOutside(aside, () => (touchOpen.value = false))

function onFocusIn(event: FocusEvent) {
  if ((event.target as Element).matches(':focus-visible')) keyboardFocus.value = true
}
function onFocusOut(event: FocusEvent) {
  if (!aside.value?.contains(event.relatedTarget as Node | null)) keyboardFocus.value = false
}

// os menus vão para o <body>: o estado aberto vem do aria-expanded dos gatilhos
useMutationObserver(
  aside,
  () => (menuOpen.value = !!aside.value?.querySelector('[aria-haspopup][aria-expanded="true"]')),
  { subtree: true, attributes: true, attributeFilter: ['aria-expanded'] },
)

function close() {
  clearTimeout(timer)
  hovering.value = keyboardFocus.value = touchOpen.value = false
}
watch(
  () => route.fullPath,
  () => (touchOpen.value = false),
)
onKeyStroke('Escape', () => {
  if (expanded.value && !menuOpen.value) close()
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
  <!-- o espaço reservado é sempre o da barra compacta: abrir não empurra o conteúdo -->
  <div class="sb-host sticky top-0 z-40 hidden h-dvh shrink-0 md:block">
    <aside
      ref="aside"
      class="app-sidebar dark"
      :class="{ 'is-open': expanded }"
      :data-collapsed="!expanded || undefined"
      aria-label="Barra lateral"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @pointerdown="onPointerDown"
      @focusin="onFocusIn"
      @focusout="onFocusOut"
    >
      <SidebarPanel :collapsed="!expanded" />
    </aside>
  </div>
</template>

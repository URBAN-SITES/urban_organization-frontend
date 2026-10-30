<script setup lang="ts">
import { X } from '@lucide/vue'
import { BrandLogo } from '@/shared/components'
import SidebarNav from './SidebarNav.vue'
import SidebarProfile from './SidebarProfile.vue'

/**
 * Conteúdo da barra lateral: marca, navegação, favoritos e perfil. O mesmo painel serve a
 * barra fixa do desktop/tablet e o menu deslizante do celular (`closable`).
 */
const {
  collapsed = false,
  size = 'md',
  closable = false,
} = defineProps<{
  collapsed?: boolean
  size?: 'md' | 'lg'
  closable?: boolean
}>()
defineEmits<{ close: [] }>()
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <header class="sb-header">
      <RouterLink to="/" class="sb-brand" aria-label="Urban Organization: início">
        <!-- a mesma logo das telas de entrada; recolhida, só a coroa oficial -->
        <BrandLogo on="dark" class="sb-brand-full" />
        <BrandLogo on="dark" variant="mark" class="sb-brand-mark" />
      </RouterLink>
      <button
        v-if="closable"
        type="button"
        class="sb-icon-button ml-auto"
        aria-label="Fechar menu"
        @click="$emit('close')"
      >
        <X :size="18" aria-hidden="true" />
      </button>
    </header>

    <SidebarNav :collapsed="collapsed" :size="size" />

    <SidebarProfile :collapsed="collapsed" />
  </div>
</template>

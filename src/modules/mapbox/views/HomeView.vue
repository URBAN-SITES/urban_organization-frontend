<script setup lang="ts">
import { MapPinOff } from '@lucide/vue'
import { defineAsyncComponent } from 'vue'
import { UiEmptyState } from '@/shared/components'

// Without a token Mapbox throws on load, so the map (and its large bundle) only loads when configured.
const configured = Boolean(import.meta.env.VITE_MAPBOX_API_KEY?.trim())
const MapboxComp = defineAsyncComponent(() => import('../components/mapboxComp.vue'))
</script>

<template>
  <MapboxComp v-if="configured" />
  <div v-else class="grid min-h-[60dvh] place-items-center px-4">
    <UiEmptyState
      :icon="MapPinOff"
      title="Mapa indisponível"
      description="O mapa precisa de uma chave do Mapbox (VITE_MAPBOX_API_KEY), que não foi configurada neste ambiente."
    />
  </div>
</template>

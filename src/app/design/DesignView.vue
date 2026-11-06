<script setup lang="ts">
import DesignGallery from './DesignGallery.vue'

/** /_design (só em desenvolvimento): todos os componentes e estados, no tema escuro (único). */
</script>

<template>
  <div class="mx-auto max-w-[1600px] p-4 sm:p-6">
    <header class="mb-6">
      <h1 class="text-24 font-semibold text-fg">Sistema de design</h1>
      <p class="mt-1 text-14 text-fg-muted">
        Componentes de <code class="font-mono text-13">src/shared/components/ui</code>. Hover, foco
        e press são interativos.
      </p>
    </header>
    <DesignGallery />
  </div>
</template>

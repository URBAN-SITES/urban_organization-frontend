<script setup lang="ts">
/**
 * Bloco de carregamento. Dê as dimensões finais do conteúdo (via class) para
 * não haver salto de layout quando os dados chegarem.
 */
defineProps<{ circle?: boolean }>()
</script>

<template>
  <span
    aria-hidden="true"
    :class="['ui-skeleton block bg-surface-3', circle ? 'rounded-full' : 'rounded-control']"
  />
</template>

<style scoped>
/* pulso lento só como sinal de carregamento; parado com movimento reduzido */
.ui-skeleton {
  animation: ui-skeleton 1.6s var(--ease-in-out) infinite alternate;
}

@keyframes ui-skeleton {
  to {
    opacity: 0.55;
  }
}
</style>

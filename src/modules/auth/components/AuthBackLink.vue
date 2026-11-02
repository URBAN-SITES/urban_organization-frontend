<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import type { RouteLocationRaw } from 'vue-router'

/** Link discreto de volta (ao login, para corrigir o e-mail); a seta recua no hover. */
defineProps<{ to: RouteLocationRaw }>()
</script>

<template>
  <RouterLink :to="to" class="auth-back">
    <ArrowLeft :size="16" aria-hidden="true" />
    <slot />
  </RouterLink>
</template>

<style>
.auth-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 4px;
  font-size: var(--text-14);
  color: var(--ds-fg-muted);
  transition: color var(--dur-fast) var(--ease-out);
}

.auth-back:hover {
  color: var(--ds-fg);
}

.auth-back:focus-visible {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}

.auth-back svg {
  transition: transform var(--dur-base) var(--ease-out);
}

.auth-back:hover svg {
  transform: translateX(-3px);
}
</style>

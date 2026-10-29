<script setup lang="ts">
import { UiSpinner } from '@/shared/components'

/** Cobre a tela enquanto a saída da conta é processada; some quando a tela de entrada já está pronta. */
defineProps<{ visible: boolean; title: string; description?: string }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="auth-cover">
      <div
        v-if="visible"
        class="fixed inset-0 z-[100] grid place-items-center bg-bg px-6 text-center"
        role="status"
        aria-live="polite"
      >
        <div class="auth-cover-content flex flex-col items-center gap-4">
          <img src="/wordmark.svg" alt="" class="w-28 dark:hidden" />
          <img src="/wordmark-inverse.svg" alt="" class="hidden w-28 dark:block" />
          <span class="mt-4 inline-flex items-center gap-2 text-14 text-fg">
            <UiSpinner :size="16" :label="title" />
            {{ title }}
          </span>
          <p v-if="description" class="max-w-xs text-13 text-fg-muted">{{ description }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.auth-cover-enter-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.auth-cover-leave-active {
  transition: opacity var(--dur-slow-exit) var(--ease-in);
}
.auth-cover-enter-from,
.auth-cover-leave-to {
  opacity: 0;
}

.auth-cover-enter-active .auth-cover-content {
  animation: ui-rise var(--dur-slow) var(--ease-out) 60ms both;
}
</style>

<script setup lang="ts">
import { BrandLogo } from '@/shared/components'

/**
 * Tela de carregamento da marca para as trocas de contexto (entrar, criar conta, sair, voltar do
 * GitHub). Fica visível só enquanto o trabalho real acontece: quem a abre também a fecha.
 */
defineProps<{ visible: boolean; title: string; description?: string }>()

const base = import.meta.env.BASE_URL
</script>

<template>
  <Teleport to="body">
    <Transition name="urban-loading">
      <div
        v-if="visible"
        class="urban-loading dark fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-black px-6 text-center"
        role="status"
        aria-live="polite"
      >
        <!-- foto do escritório ao fundo, escurecida para a marca e o texto ficarem legíveis -->
        <picture class="urban-loading-photo" aria-hidden="true">
          <source
            media="(max-width: 1023px)"
            :srcset="`${base}images/office-executive-sm.webp`"
            type="image/webp"
          />
          <img :src="`${base}images/office-executive.webp`" alt="" decoding="async" />
        </picture>
        <span class="urban-loading-light" aria-hidden="true" />
        <div class="urban-loading-content relative flex flex-col items-center">
          <BrandLogo on="dark" class="urban-loading-logo w-36" />
          <span class="urban-loading-bar mt-8" aria-hidden="true" />
          <p class="mt-6 text-14 font-medium text-white">{{ title }}</p>
          <p v-if="description" class="mt-1.5 max-w-xs text-13 text-white/75">
            {{ description }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.urban-loading-enter-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.urban-loading-leave-active {
  transition: opacity var(--dur-slow-exit) var(--ease-in);
}
.urban-loading-enter-from,
.urban-loading-leave-to {
  opacity: 0;
}

.urban-loading-enter-active .urban-loading-content {
  animation: ui-rise var(--dur-slow) var(--ease-out) 60ms backwards;
}

.urban-loading-photo,
.urban-loading-photo img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.urban-loading-photo img {
  object-fit: cover;
  object-position: 35% 50%;
  animation: urban-loading-drift 14s ease-out both;
}

.urban-loading-photo::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgb(0 0 0 / 0.55), rgb(0 0 0 / 0.82) 70%);
}

@keyframes urban-loading-drift {
  from {
    transform: scale(1.08);
  }
}

/* luz quente bem suave atrás da marca, como o pôr do sol das fotos */
.urban-loading-light {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(720px, 140vw);
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(249 159 17 / 0.14), transparent 60%);
  animation: urban-loading-breathe 3.2s ease-in-out infinite;
  pointer-events: none;
}

.urban-loading-logo {
  animation: urban-loading-glow 2.4s ease-in-out infinite;
}

.urban-loading-bar {
  position: relative;
  display: block;
  width: 160px;
  height: 3px;
  overflow: hidden;
  border-radius: 3px;
  background: rgb(255 255 255 / 0.08);
}

.urban-loading-bar::after {
  content: '';
  position: absolute;
  inset-block: 0;
  left: 0;
  width: 45%;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, #f99f11 40%, #ffd08a);
  box-shadow: 0 0 12px rgb(249 159 17 / 0.8);
  animation: urban-loading-run 1.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}

@keyframes urban-loading-run {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(260%);
  }
}

@keyframes urban-loading-glow {
  50% {
    filter: drop-shadow(0 0 14px rgb(249 159 17 / 0.35));
  }
}

@keyframes urban-loading-breathe {
  50% {
    opacity: 0.6;
    scale: 0.92;
  }
}

@media (prefers-reduced-motion: reduce) {
  .urban-loading-light,
  .urban-loading-logo,
  .urban-loading-photo img {
    animation: none;
  }
  .urban-loading-bar::after {
    animation-duration: 2.4s;
  }
}
</style>

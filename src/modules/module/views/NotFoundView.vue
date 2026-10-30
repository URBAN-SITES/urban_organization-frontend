<script setup lang="ts">
import { House } from '@lucide/vue'
</script>

<template>
  <section class="notfound dark">
    <img
      class="notfound-media"
      src="/images/office-boardroom.webp"
      srcset="/images/office-boardroom-sm.webp 960w, /images/office-boardroom.webp 1920w"
      sizes="100vw"
      alt=""
      decoding="async"
    />
    <div class="ui-rise mx-auto flex w-full max-w-xl flex-col items-center px-5 text-center">
      <p
        class="font-mono text-[96px] leading-none font-semibold tracking-[-0.04em] text-[#f99f11] sm:text-[128px]"
      >
        404
      </p>
      <h1 class="mt-4 text-24 font-semibold tracking-[-0.02em] text-white sm:text-32">
        Página não encontrada
      </h1>
      <p class="mt-2 text-14 text-white/70">
        O endereço pode ter mudado ou a página não existe mais. Verifique o link ou volte para o
        início.
      </p>
      <RouterLink to="/" class="notfound-action">
        <House :size="16" aria-hidden="true" />
        Voltar ao início
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.notfound {
  position: relative;
  isolation: isolate;
  display: flex;
  min-height: 100dvh;
  width: 100%;
  align-items: center;
  overflow: hidden;
  background: #000000;
  color: #ffffff;
}

.notfound-media {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: uo-hero-settle 1.4s var(--ease-out) both;
}

.notfound::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  content: '';
  background:
    radial-gradient(40% 50% at 50% 35%, rgb(249 159 17 / 0.16), transparent 70%), rgb(0 0 0 / 0.78);
}

.notfound-action {
  display: inline-flex;
  height: 40px;
  align-items: center;
  gap: 8px;
  margin-top: 32px;
  border-radius: 999px;
  background: #f99f11;
  padding-inline: 18px;
  font-size: var(--text-14);
  font-weight: 500;
  color: #000000;
  box-shadow: 0 8px 24px -10px rgb(249 159 17 / 0.8);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.notfound-action:hover {
  background: #fab13f;
}

.notfound-action:active {
  transform: scale(0.97);
}

.notfound-action:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .notfound-media {
    animation: none;
  }
}
</style>

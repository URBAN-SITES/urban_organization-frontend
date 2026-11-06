<template>
  <!-- envelope que se desenha e recebe o check: confirmação de envio sem depender de imagem -->
  <span class="auth-sent-icon" aria-hidden="true">
    <svg viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect class="auth-sent-draw" x="8" y="16" width="48" height="34" rx="6" pathLength="1" />
      <path class="auth-sent-draw auth-sent-flap" d="M10 19 32 35 54 19" pathLength="1" />
      <circle class="auth-sent-badge" cx="49" cy="47" r="10" />
      <path class="auth-sent-draw auth-sent-check" d="m44.5 47 3.2 3.2 6-6.4" pathLength="1" />
    </svg>
  </span>
</template>

<style>
.auth-sent-icon {
  position: relative;
  display: grid;
  width: 5rem;
  height: 5rem;
  place-items: center;
  border-radius: 999px;
  background: radial-gradient(circle, rgb(249 159 17 / 0.16), transparent 70%);
  animation: auth-sent-pop 520ms var(--ease-out) backwards;
}

.auth-sent-icon::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgb(249 159 17 / 0.5);
  animation: auth-sent-ring 1.6s var(--ease-out) 700ms backwards;
  opacity: 0;
}

.auth-sent-icon svg {
  width: 3.25rem;
  height: 3.25rem;
}

.auth-sent-draw {
  stroke: var(--ds-accent);
  stroke-width: 2.5;
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  animation: auth-sent-stroke 640ms var(--ease-out) 120ms backwards;
}

.auth-sent-flap {
  animation-delay: 360ms;
}

.auth-sent-badge {
  fill: var(--ds-accent);
  transform-origin: 49px 47px;
  animation: auth-sent-pop 360ms var(--ease-out) 620ms backwards;
}

.auth-sent-check {
  stroke: var(--ds-accent-fg);
  stroke-width: 3;
  animation-delay: 820ms;
  animation-duration: 360ms;
}

@keyframes auth-sent-stroke {
  from {
    stroke-dashoffset: 1;
  }
}

@keyframes auth-sent-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

@keyframes auth-sent-ring {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-sent-icon,
  .auth-sent-icon::after,
  .auth-sent-draw,
  .auth-sent-badge {
    animation: none;
  }
}
</style>

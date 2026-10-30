<template>
  <!--
    Borda orgânica iluminada: preenchimento preto à direita da curva e a linha laranja com brilho.
    A mesma forma desenha a divisa do painel institucional e a ponta da cortina da transição,
    então o fim da animação encaixa exatamente na composição nova.
  -->
  <svg class="auth-edge" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
    <path
      class="auth-edge-fill"
      d="M100 0 L74 0 C30 120 22 210 46 330 S30 760 0 1000 L100 1000 Z"
    />
    <path
      class="auth-edge-glow"
      d="M74 0 C30 120 22 210 46 330 S30 760 0 1000"
      vector-effect="non-scaling-stroke"
    />
    <path
      class="auth-edge-line"
      d="M74 0 C30 120 22 210 46 330 S30 760 0 1000"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<style>
.auth-edge {
  width: var(--auth-edge-width);
  pointer-events: none;
}

.auth-edge-fill {
  fill: #000;
}

.auth-edge-line,
.auth-edge-glow {
  fill: none;
  stroke: var(--ds-accent);
}

.auth-edge-line {
  stroke-width: 1.5px;
}

.auth-edge-glow {
  stroke-width: 8px;
  opacity: 0.35;
  filter: blur(6px);
  animation: auth-edge-breathe 4.8s ease-in-out infinite;
}

@keyframes auth-edge-breathe {
  50% {
    opacity: 0.6;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-edge-glow {
    animation: none;
  }
}
</style>

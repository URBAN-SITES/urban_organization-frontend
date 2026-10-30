<template>
  <!--
    Borda orgânica: preenchimento preto à direita da curva e a linha laranja, sem brilho nem sombra.
    A mesma forma desenha a divisa do painel institucional e a ponta da cortina da transição,
    então o fim da animação encaixa exatamente na composição nova.
  -->
  <svg class="auth-edge" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
    <path
      class="auth-edge-fill"
      d="M100 0 L74 0 C30 120 22 210 46 330 S30 760 0 1000 L100 1000 Z"
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

.auth-edge-line {
  fill: none;
  stroke: var(--ds-accent);
  stroke-width: 1.5px;
}
</style>

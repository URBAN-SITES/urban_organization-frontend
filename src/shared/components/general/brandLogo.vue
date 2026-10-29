<script setup lang="ts">
/* COMO USAR:
  <BrandLogo />                 logo completa; segue o tema (texto branco no escuro, preto no claro)
  <BrandLogo on="dark" />       sempre a versão para fundo escuro (painéis pretos, telas de carga)
  <BrandLogo variant="mark" />  só a coroa, no ícone arredondado oficial
  Arquivos oficiais em public/brand; não redesenhar a marca com texto ou ícone.
*/
const { variant = 'full', on = 'auto' } = defineProps<{
  variant?: 'full' | 'mark'
  on?: 'auto' | 'dark' | 'light'
}>()

const base = import.meta.env.BASE_URL
const SRC = {
  full: {
    dark: `${base}brand/urban-logo-on-dark.png`,
    light: `${base}brand/urban-logo-on-light.png`,
  },
  mark: { dark: `${base}brand/urban-icon-dark.png`, light: `${base}brand/urban-icon-light.png` },
} as const
</script>

<template>
  <img v-if="on !== 'auto'" :src="SRC[variant][on]" alt="Urban Organization" draggable="false" />
  <span v-else class="inline-flex">
    <img
      :src="SRC[variant].light"
      alt="Urban Organization"
      draggable="false"
      class="size-full object-contain dark:hidden"
    />
    <img
      :src="SRC[variant].dark"
      alt="Urban Organization"
      draggable="false"
      class="hidden size-full object-contain dark:block"
    />
  </span>
</template>

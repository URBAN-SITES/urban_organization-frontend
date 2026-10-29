<script setup lang="ts">
import TopbarComp from './topbarComp.vue'

/* COMO USAR:
  <PageLayout :crumbs="['Conta', 'Planos']" title="Planos" description="...">
    <template #actions><UiButton>...</UiButton></template>
    conteúdo
  </PageLayout>
  Molde único das telas internas: topbar, coluna centralizada, cabeçalho (título,
  descrição e ações) e o conteúdo logo abaixo, sempre com o mesmo espaçamento.
  `width`: narrow (leitura), default, wide (tabelas e grades) ou full.
*/

const {
  title = '',
  description = '',
  width = 'default',
  showSearch = false,
  searchPlaceholder,
} = defineProps<{
  crumbs: string[]
  title?: string
  description?: string
  width?: 'narrow' | 'default' | 'wide' | 'full'
  showSearch?: boolean
  searchPlaceholder?: string
}>()

const search = defineModel<string>('search', { default: '' })

const WIDTHS = {
  narrow: 'max-w-3xl',
  default: 'max-w-4xl',
  wide: 'max-w-6xl',
  full: '',
} as const
</script>

<template>
  <div class="flex min-h-dvh w-full min-w-0 flex-col bg-bg text-fg">
    <TopbarComp
      v-model:search="search"
      :crumbs="crumbs"
      :show-search="showSearch"
      :search-placeholder="searchPlaceholder"
    />

    <main
      :class="[
        'mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 px-4 pt-6 pb-10 sm:px-8',
        WIDTHS[width],
      ]"
    >
      <slot name="top" />

      <header
        v-if="title || $slots.title || $slots.actions"
        class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
      >
        <div class="min-w-0">
          <h1 class="text-24 leading-tight font-semibold tracking-[-0.01em] text-fg">
            <slot name="title">{{ title }}</slot>
          </h1>
          <p v-if="description || $slots.description" class="mt-1 max-w-2xl text-14 text-fg-muted">
            <slot name="description">{{ description }}</slot>
          </p>
        </div>
        <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
          <slot name="actions" />
        </div>
      </header>

      <slot />
    </main>
  </div>
</template>

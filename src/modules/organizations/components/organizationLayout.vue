<script setup lang="ts">
import { watch } from 'vue'
import DefaultLayout from '@/app/layouts/DefaultLayout.vue'
import { TopbarComp } from '@/shared/components'
import { useOrganizationsStore } from '../stores'
import '../organizations.css'

const props = defineProps<{
  title: string
  description?: string
  organizationId?: string
  /** telas ainda não migradas (times, setores) dependem do CSS antigo de .workspace */
  legacy?: boolean
}>()
const organizations = useOrganizationsStore()

// abrir/trocar a organização aqui a torna a selecionada (chat, times...)
watch(
  () => props.organizationId,
  (id) => id && organizations.select(id),
  { immediate: true },
)

const TABS = [
  { name: 'OrganizationMembers', label: 'Membros e convites' },
  { name: 'OrganizationTeams', label: 'Times' },
  { name: 'OrganizationSectors', label: 'Projetos' },
  { name: 'OrganizationSettings', label: 'Configurações' },
]
</script>

<template>
  <DefaultLayout>
    <div :class="['flex min-h-dvh w-full min-w-0 flex-col bg-bg', { workspace: legacy }]">
      <TopbarComp :crumbs="[title]" />
      <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 pb-10 sm:px-8">
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div class="min-w-0">
            <h1 class="text-24 leading-tight font-semibold tracking-[-0.01em] text-fg">
              {{ title }}
            </h1>
            <p v-if="description" class="mt-1 text-14 text-fg-muted">{{ description }}</p>
          </div>
          <div class="flex items-center gap-2">
            <slot name="actions" />
          </div>
        </header>

        <nav
          v-if="organizationId"
          class="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
          aria-label="Administração da organização"
        >
          <RouterLink
            v-for="tab in TABS"
            :key="tab.name"
            v-slot="{ href, navigate, isActive }"
            :to="{ name: tab.name, params: { organizationId } }"
            custom
          >
            <a
              :href="href"
              :aria-current="isActive ? 'page' : undefined"
              :class="[
                'relative -mb-px shrink-0 border-b-2 px-3 py-2.5 text-13 whitespace-nowrap',
                'transition-colors duration-(--dur-fast) ease-out focus-visible:outline-2 focus-visible:outline-accent',
                isActive
                  ? 'border-fg font-medium text-fg'
                  : 'border-transparent text-fg-muted hover:text-fg',
              ]"
              @click="navigate"
            >
              {{ tab.label }}
            </a>
          </RouterLink>
        </nav>

        <slot />
      </main>
    </div>
  </DefaultLayout>
</template>

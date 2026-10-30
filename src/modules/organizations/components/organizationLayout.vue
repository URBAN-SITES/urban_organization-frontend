<script setup lang="ts">
import { Building } from '@lucide/vue'
import { watch } from 'vue'
import DefaultLayout from '@/app/layouts/DefaultLayout.vue'
import { PageLayout } from '@/shared/components'
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
    <PageLayout
      :icon="Building"
      tone="#f99f11"
      :crumbs="[title]"
      :title="title"
      :description="description"
      width="wide"
      :class="{ workspace: legacy }"
    >
      <template v-if="$slots.actions" #actions><slot name="actions" /></template>

      <nav
        v-if="organizationId"
        class="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border px-4 sm:mx-0 sm:px-0"
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
                ? 'border-accent font-medium text-fg'
                : 'border-transparent text-fg-muted hover:text-fg',
            ]"
            @click="navigate"
          >
            {{ tab.label }}
          </a>
        </RouterLink>
      </nav>

      <slot />
    </PageLayout>
  </DefaultLayout>
</template>

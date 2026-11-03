<script setup lang="ts">
import { ChevronRight, Star } from '@lucide/vue'
import { useStorage } from '@vueuse/core'
import { computed, useId } from 'vue'
import { useRoute } from 'vue-router'
import { ProjectIcon, useSectorsStore } from '@/modules/module'
import { useOrganizationsStore } from '@/modules/organizations'

/** Projetos fixados (estrela) da organização atual, com a seção recolhível. */
const { collapsed = false, size = 'md' } = defineProps<{
  collapsed?: boolean
  size?: 'md' | 'lg'
}>()

// recolhida, a barra mostra só os primeiros; a lista expandida rola depois de alguns itens
const RAIL_LIMIT = 5

const route = useRoute()
const sectors = useSectorsStore()
const organizations = useOrganizationsStore()
const open = useStorage('urban:sidebar-favorites-open', true)
const listId = useId()

const favorites = computed(() => sectors.sectors.filter((sector) => sector.is_favorite))
const shown = computed(() => (collapsed ? favorites.value.slice(0, RAIL_LIMIT) : favorites.value))
const projectsPath = computed(() =>
  organizations.current ? `/organizacoes/${organizations.current.id}/projetos` : '/organizacoes',
)
const isOpen = (id: string) => route.path === `/setores/${id}`
</script>

<template>
  <section class="sb-group" aria-labelledby="sb-favorites-title">
    <h2 id="sb-favorites-title" class="sb-group-title">
      <button
        type="button"
        class="sb-section-toggle sidebar-label"
        :aria-expanded="open"
        :aria-controls="listId"
        @click="open = !open"
      >
        <ChevronRight :size="12" :stroke-width="2.25" class="sb-chevron" aria-hidden="true" />
        Favoritos
        <span v-if="favorites.length" class="sb-section-count">{{ favorites.length }}</span>
      </button>
    </h2>

    <div :id="listId" class="sb-collapse" :data-open="open || collapsed || undefined">
      <div class="min-h-0">
        <ul v-if="favorites.length" class="sb-favorites grid gap-0.5">
          <li v-for="sector in shown" :key="sector.id">
            <RouterLink
              :to="`/setores/${sector.id}`"
              :aria-current="isOpen(sector.id) ? 'page' : undefined"
              :aria-label="collapsed ? sector.name : undefined"
              :data-current="isOpen(sector.id) || undefined"
              :class="['sb-project group', size === 'lg' ? 'h-11 text-14' : 'h-9 text-13']"
              :style="{ '--project': sector.color || 'var(--sb-muted)' }"
            >
              <ProjectIcon :icon="sector.icon" :color="sector.color" size="sm" />
              <span class="sidebar-label min-w-0 flex-1 truncate">{{ sector.name }}</span>
              <span class="sb-project-mark sidebar-label" aria-hidden="true" />
            </RouterLink>
          </li>
        </ul>
        <RouterLink v-else :to="projectsPath" class="sb-empty sidebar-label">
          <Star :size="14" aria-hidden="true" />
          Marque a estrela de um projeto para fixá-lo aqui.
        </RouterLink>
      </div>
    </div>
  </section>
</template>

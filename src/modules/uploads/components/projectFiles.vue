<script setup lang="ts">
import { FileText } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiEmptyState, UiSkeleton } from '@/shared/components'
import { relativeTime } from '@/shared/utils/time'
import { listFiles } from '../services'
import type { OrganizationFile } from '../types'
import { FILE_ORIGINS } from '../utils/origins'
import { BADGE, BADGE_BASE } from '../utils/ui'

/** Arquivos e links do projeto e das tarefas dele (a parte "arquivos" de Documentos). */
const props = defineProps<{ organizationId: string; sectorId: string }>()

const files = ref<OrganizationFile[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const all = await listFiles(props.organizationId)
    files.value = all.filter((file) => file.sector_id === props.sectorId)
  } catch (cause) {
    error.value = getErrorMessage(cause, 'Não foi possível carregar os arquivos do projeto.')
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => props.sectorId, load)
</script>

<template>
  <section class="grid gap-3" aria-labelledby="project-files-title">
    <h2 id="project-files-title" class="text-16 font-semibold">Arquivos</h2>
    <div v-if="loading" class="grid gap-2" aria-label="Carregando arquivos">
      <UiSkeleton v-for="n in 3" :key="n" class="h-12 rounded-card" />
    </div>
    <p v-else-if="error" role="alert" class="text-13 text-danger">{{ error }}</p>
    <UiEmptyState
      v-else-if="!files.length"
      :icon="FileText"
      title="Nenhum arquivo neste projeto"
      description="Anexos e links colocados nas tarefas do projeto aparecem aqui."
    />
    <ul v-else class="uo-card divide-y divide-border">
      <li
        v-for="file in files"
        :key="file.id"
        class="flex min-w-0 items-center gap-3 px-4 py-3 text-13"
      >
        <span :class="[BADGE_BASE, BADGE[FILE_ORIGINS[file.origin].tone], 'shrink-0']">{{
          FILE_ORIGINS[file.origin].label
        }}</span>
        <a
          :href="file.url"
          target="_blank"
          rel="noopener noreferrer"
          class="min-w-0 flex-1 truncate font-medium hover:underline"
          :title="file.title"
          >{{ file.title }}</a
        >
        <span v-if="file.task_title" class="hidden max-w-[220px] truncate text-fg-muted sm:inline">
          {{ file.task_title }}
        </span>
        <span class="shrink-0 text-fg-muted">{{ relativeTime(file.created_at) }}</span>
      </li>
    </ul>
  </section>
</template>

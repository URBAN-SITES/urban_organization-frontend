<script setup lang="ts">
import {
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Link2,
  Search,
  Trash2,
  Upload,
} from '@lucide/vue'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiButton, UiEmptyState, UiIconButton, UiInput, UiSkeleton } from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { relativeTime } from '@/shared/utils/time'
import { attachToSector, listFiles, MAX_UPLOAD_BYTES, removeFile, uploadFile } from '../services'
import type { OrganizationFile } from '../types'
import { FILE_ORIGINS } from '../utils/origins'
import { BADGE, BADGE_BASE } from '../utils/ui'

/**
 * Arquivos e links do projeto e das tarefas dele (a parte "arquivos" de Documentos).
 * Quem edita o projeto envia arquivos (botão ou arrastando), adiciona links e remove.
 */
const props = defineProps<{ organizationId: string; sectorId: string; canEdit?: boolean }>()
const confirm = useConfirm()

const files = ref<OrganizationFile[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const uploading = ref<{ name: string; failed?: string }[]>([])
const dragging = ref(false)
const linkOpen = ref(false)
const link = ref({ title: '', url: '' })
const input = useTemplateRef<HTMLInputElement>('input')

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

const visible = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('pt-BR')
  if (!query) return files.value
  return files.value.filter((file) =>
    [file.title, file.task_title, file.owner_name]
      .filter(Boolean)
      .some((text) => text!.toLocaleLowerCase('pt-BR').includes(query)),
  )
})

const EXT: [RegExp, typeof File][] = [
  [/\.(png|jpe?g|gif|webp|svg|avif)$/i, FileImage],
  [/\.(mp4|mov|webm|mkv)$/i, FileVideo],
  [/\.(xlsx?|csv|ods)$/i, FileSpreadsheet],
  [/\.(zip|rar|7z|tar|gz)$/i, FileArchive],
  [/\.(pdf|docx?|odt|txt|md|pptx?)$/i, FileText],
]
function iconFor(file: OrganizationFile) {
  if (file.origin === 'link') return Link2
  const name = `${file.title} ${file.url.split('?')[0]}`
  return EXT.find(([pattern]) => pattern.test(name))?.[1] ?? File
}

async function send(list: FileList | File[]) {
  const chosen = Array.from(list)
  if (!chosen.length) return
  uploading.value = chosen.map((file) => ({ name: file.name }))
  let sent = 0
  await Promise.all(
    chosen.map(async (file, index) => {
      try {
        if (file.size > MAX_UPLOAD_BYTES) throw new Error('Maior que 10 MB.')
        const { url } = await uploadFile(file)
        // o upload pode devolver um caminho relativo; o link do projeto pede o endereço completo
        const absolute = new URL(url, window.location.origin).href
        await attachToSector(props.sectorId, { title: file.name.slice(0, 200), url: absolute })
        sent += 1
      } catch (cause) {
        uploading.value[index]!.failed = cause instanceof Error ? cause.message : 'Falhou.'
      }
    }),
  )
  if (sent) toast.success(sent === 1 ? 'Arquivo adicionado.' : `${sent} arquivos adicionados.`)
  const failed = uploading.value.filter((item) => item.failed)
  uploading.value = failed
  if (input.value) input.value.value = ''
  await load()
}

function onDrop(event: DragEvent) {
  dragging.value = false
  if (props.canEdit && event.dataTransfer?.files.length) void send(event.dataTransfer.files)
}

async function addLink() {
  const url = link.value.url.trim()
  if (!/^https?:\/\//i.test(url)) {
    toast.error('Cole um link que comece com http:// ou https://')
    return
  }
  try {
    await attachToSector(props.sectorId, {
      title: link.value.title.trim() || url.replace(/^https?:\/\//, '').slice(0, 200),
      url,
    })
    link.value = { title: '', url: '' }
    linkOpen.value = false
    toast.success('Link adicionado.')
    await load()
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  }
}

async function remove(file: OrganizationFile) {
  const ok = await confirm({
    title: `Remover “${file.title}”?`,
    description: file.task_title
      ? `Ele sai também da tarefa “${file.task_title}”.`
      : 'Ele sai dos arquivos do projeto.',
    confirmLabel: 'Remover',
    danger: true,
  })
  if (!ok) return
  try {
    await removeFile(file.id)
    files.value = files.value.filter((row) => row.id !== file.id)
    toast.success('Removido.')
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  }
}
</script>

<template>
  <section
    class="grid gap-3"
    aria-labelledby="project-files-title"
    @dragover.prevent="dragging = !!canEdit"
    @dragleave.self="dragging = false"
    @drop.prevent="onDrop"
  >
    <div class="flex flex-wrap items-center gap-2">
      <h2 id="project-files-title" class="mr-auto text-16 font-semibold">
        Arquivos <span class="font-mono text-13 font-normal text-fg-muted">{{ files.length }}</span>
      </h2>
      <UiInput
        v-if="files.length > 4"
        v-model="search"
        :icon="Search"
        placeholder="Buscar arquivo"
        aria-label="Buscar arquivo"
        class="w-48"
      />
      <template v-if="canEdit">
        <UiButton size="sm" variant="ghost" :icon="Link2" @click="linkOpen = !linkOpen">
          Link
        </UiButton>
        <UiButton size="sm" variant="primary" :icon="Upload" @click="input?.click()">
          Enviar arquivos
        </UiButton>
        <input
          ref="input"
          type="file"
          multiple
          class="sr-only"
          aria-label="Escolher arquivos para enviar"
          @change="send(($event.target as HTMLInputElement).files ?? [])"
        />
      </template>
    </div>

    <form
      v-if="linkOpen"
      class="grid gap-2 rounded-card border border-border p-3 sm:grid-cols-[1fr_1.5fr_auto]"
      @submit.prevent="addLink"
    >
      <UiInput v-model="link.title" label="Nome (opcional)" maxlength="200" />
      <UiInput v-model="link.url" label="Link" placeholder="https://" required />
      <UiButton type="submit" variant="primary" class="self-end">Adicionar</UiButton>
    </form>

    <div
      v-if="canEdit"
      :class="[
        'grid place-items-center rounded-card border-2 border-dashed px-4 py-5 text-center text-13 transition-colors',
        dragging ? 'border-accent bg-accent/[0.06] text-fg' : 'border-border text-fg-muted',
      ]"
    >
      <p>
        <Upload :size="16" class="mr-1 inline" aria-hidden="true" />
        Arraste arquivos para cá ou use “Enviar arquivos” · até 10 MB cada
      </p>
    </div>

    <ul v-if="uploading.length" class="grid gap-1 text-12" aria-live="polite">
      <li v-for="item in uploading" :key="item.name" class="flex items-center gap-2">
        <span class="min-w-0 flex-1 truncate">{{ item.name }}</span>
        <span :class="item.failed ? 'text-danger' : 'text-fg-muted'">
          {{ item.failed ?? 'Enviando…' }}
        </span>
      </li>
    </ul>

    <div v-if="loading" class="grid gap-2" aria-label="Carregando arquivos">
      <UiSkeleton v-for="n in 3" :key="n" class="h-12 rounded-card" />
    </div>
    <p v-else-if="error" role="alert" class="text-13 text-danger">{{ error }}</p>
    <UiEmptyState
      v-else-if="!files.length"
      :icon="FileText"
      title="Nenhum arquivo neste projeto"
      :description="
        canEdit
          ? 'Envie arquivos ou links aqui. Anexos das tarefas do projeto também aparecem.'
          : 'Anexos e links colocados nas tarefas do projeto aparecem aqui.'
      "
    />
    <p v-else-if="!visible.length" class="text-13 text-fg-muted">Nada encontrado.</p>
    <ul v-else class="uo-card divide-y divide-border">
      <li
        v-for="file in visible"
        :key="file.id"
        class="group flex min-w-0 items-center gap-3 px-4 py-3 text-13"
      >
        <component
          :is="iconFor(file)"
          :size="18"
          class="shrink-0 text-fg-muted"
          aria-hidden="true"
        />
        <a
          :href="file.url"
          target="_blank"
          rel="noopener noreferrer"
          class="min-w-0 flex-1 truncate font-medium hover:underline"
          :title="file.title"
          >{{ file.title }}</a
        >
        <span
          :class="[
            BADGE_BASE,
            BADGE[FILE_ORIGINS[file.origin].tone],
            'hidden shrink-0 sm:inline-flex',
          ]"
          >{{ FILE_ORIGINS[file.origin].label }}</span
        >
        <span v-if="file.task_title" class="hidden max-w-[200px] truncate text-fg-muted md:inline">
          {{ file.task_title }}
        </span>
        <span class="shrink-0 text-fg-muted">{{ relativeTime(file.created_at) }}</span>
        <UiIconButton
          v-if="canEdit && file.origin !== 'meet'"
          :icon="Trash2"
          size="sm"
          :label="`Remover ${file.title}`"
          class="opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
          @click="remove(file)"
        />
      </li>
    </ul>
  </section>
</template>

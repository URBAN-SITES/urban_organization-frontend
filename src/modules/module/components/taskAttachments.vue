<script setup lang="ts">
import { ExternalLink, FileUp, Link2, Trash2 } from '@lucide/vue'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import type { DriveTaskLink } from '@/modules/calendar_sync'
import { uploadFile } from '@/modules/uploads'
import { UiButton, UiIconButton, UiInput } from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { useLinksStore } from '../stores/links'
import { LINK_ORIGINS, linkOrigin } from '../utils/board'
import TaskGoogle from './taskGoogle.vue'

/** Anexos: links, arquivos enviados (ficam guardados como link) e arquivos do Drive. */
const props = defineProps<{ taskId: string; dueDate: string; canEdit: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const store = useLinksStore()
const confirm = useConfirm()

const url = ref('')
const title = ref('')
const urlError = ref('')
const adding = ref(false)
const uploading = ref(false)
const fileInput = useTemplateRef<HTMLInputElement>('file')
const links = computed(() => store.forTarget('task', props.taskId))

watch(
  () => props.taskId,
  (id) => {
    url.value = title.value = urlError.value = ''
    store
      .load('task', id)
      .catch((cause: unknown) =>
        toast.error(getErrorMessage(cause, 'Não foi possível carregar os anexos.')),
      )
  },
  { immediate: true },
)

function validUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

async function addLink() {
  const value = url.value.trim()
  urlError.value = validUrl(value) ? '' : 'Cole um endereço completo, começando com https://.'
  if (urlError.value || adding.value) return
  adding.value = true
  try {
    await store.add('task', props.taskId, {
      url: value,
      ...(title.value.trim() && { title: title.value.trim().slice(0, 255) }),
    })
    url.value = title.value = ''
    emit('changed')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível anexar o link.'))
  } finally {
    adding.value = false
  }
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  try {
    const { url: stored } = await uploadFile(file)
    await store.add('task', props.taskId, { url: stored, title: file.name.slice(0, 255) })
    toast.success('Arquivo anexado.')
    emit('changed')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível enviar o arquivo.'))
  } finally {
    uploading.value = false
  }
}

async function remove(id: string, name: string) {
  const ok = await confirm({
    title: `Remover “${name}”?`,
    description: 'O anexo sai da tarefa.',
    confirmLabel: 'Remover',
    danger: true,
  })
  if (!ok) return
  try {
    await store.remove('task', props.taskId, id)
    emit('changed')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível remover o anexo.'))
  }
}

function onDrive(link: DriveTaskLink) {
  store.put('task', props.taskId, link)
  emit('changed')
}
</script>

<template>
  <section aria-labelledby="task-attachments" class="grid gap-3">
    <h3 id="task-attachments" class="text-13 font-semibold text-fg">
      Anexos
      <span v-if="links.length" class="font-normal text-fg-muted">{{ links.length }}</span>
    </h3>

    <ul v-if="links.length" class="divide-y divide-border rounded-card border border-border">
      <li v-for="link in links" :key="link.id" class="flex items-center gap-3 px-3 py-2">
        <component
          :is="LINK_ORIGINS[linkOrigin(link.url)].icon"
          :size="16"
          class="shrink-0 text-fg-muted"
          aria-hidden="true"
        />
        <a
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="min-w-0 flex-1 truncate rounded-[4px] text-14 text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {{ link.title || link.url }}
          <ExternalLink :size="12" class="ml-1 inline text-fg-muted" aria-hidden="true" />
          <span class="sr-only">(abre em nova aba)</span>
        </a>
        <span class="hidden text-12 text-fg-muted sm:inline">
          {{ LINK_ORIGINS[linkOrigin(link.url)].label }}
        </span>
        <UiIconButton
          v-if="canEdit"
          :icon="Trash2"
          size="sm"
          :label="`Remover ${link.title || link.url}`"
          @click="remove(link.id, link.title || link.url)"
        />
      </li>
    </ul>

    <template v-if="canEdit">
      <form
        class="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
        novalidate
        @submit.prevent="addLink"
      >
        <UiInput
          v-model="url"
          type="url"
          placeholder="https://"
          aria-label="Endereço do link"
          :icon="Link2"
          :error="urlError"
        />
        <UiInput v-model="title" placeholder="Nome (opcional)" aria-label="Nome do link" />
        <UiButton type="submit" :loading="adding" :disabled="!url.trim()">Anexar link</UiButton>
      </form>
      <div class="flex flex-wrap items-center gap-2">
        <UiButton
          size="sm"
          variant="ghost"
          :icon="FileUp"
          :loading="uploading"
          @click="fileInput?.click()"
        >
          Enviar arquivo
        </UiButton>
        <span class="text-12 text-fg-muted">até 10 MB</span>
        <input
          ref="file"
          type="file"
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
          @change="upload"
        />
      </div>
    </template>

    <TaskGoogle :task-id="taskId" :due-date="dueDate" :can-edit="canEdit" @attached="onDrive" />
  </section>
</template>

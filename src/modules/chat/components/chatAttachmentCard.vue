<script setup lang="ts">
import { computed } from 'vue'
import type { DemoAttachment } from '../types'
import { formatSize } from '../utils'

const props = defineProps<{ file: DemoAttachment }>()

// o Chrome grava webm sem a duração: pular para o fim uma vez faz o navegador calculá-la
function fixDuration(event: Event) {
  const audio = event.target as HTMLAudioElement
  if (audio.duration !== Infinity) return
  audio.addEventListener('timeupdate', () => (audio.currentTime = 0), { once: true })
  audio.currentTime = 1e101
}

const details = computed(() => {
  const type = props.file.mime_type.split('/').pop()?.toUpperCase() ?? 'ARQUIVO'
  return [
    type,
    props.file.pages ? `${props.file.pages} páginas` : '',
    formatSize(props.file.size_bytes),
  ]
    .filter(Boolean)
    .join(' · ')
})
</script>

<template>
  <figure
    v-if="file.mime_type.startsWith('audio/')"
    class="m-0 flex w-fit max-w-full flex-col gap-[4px]"
  >
    <audio
      :src="file.url"
      controls
      preload="metadata"
      @loadedmetadata="fixDuration"
      class="h-[40px] w-[280px] max-w-full"
    >
      <a :href="file.url" target="_blank" rel="noopener noreferrer">Baixar o áudio</a>
    </audio>
    <figcaption class="sr-only">Mensagem de voz</figcaption>
  </figure>
  <a
    v-else
    :href="file.url"
    target="_blank"
    rel="noopener noreferrer"
    class="flex w-fit max-w-full items-center gap-[10px] rounded-[10px] border border-border bg-surface-1 py-[8px] pr-[14px] pl-[8px] transition-colors hover:border-border-strong hover:bg-surface-2 dark:bg-black/20 dark:hover:bg-surface-2"
  >
    <span
      class="grid size-[32px] shrink-0 place-items-center rounded-[8px] bg-[#e8efff] text-[#2563eb] dark:bg-[#2563eb]/20 dark:text-[#8fb1ff]"
    >
      <span class="material-symbols-outlined text-[18px]!" aria-hidden="true">description</span>
    </span>
    <span class="flex min-w-0 flex-col leading-normal">
      <span class="truncate text-[13px] font-medium">{{
        file.file_name.replace(/\.\w+$/, '')
      }}</span>
      <span class="text-[11.5px] text-fg-muted">{{ details }}</span>
    </span>
  </a>
</template>

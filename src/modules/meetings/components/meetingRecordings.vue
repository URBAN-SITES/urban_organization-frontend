<script setup lang="ts">
import { Download, RefreshCw, Sparkles, Trash2 } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { UiBadge, UiButton, UiIconButton, UiSkeleton } from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import type { UUID } from '@/shared/types'
import { deleteRecording, listRecordings } from '../services'
import type { MeetingRecording } from '../types'
import {
  formatDuration,
  formatSize,
  INSIGHT_STATUS,
  RECORDING_STATUS,
  recordingError,
} from '../utils'

/** Gravações de uma reunião: player, baixar (autorizados) e apagar. */
const props = defineProps<{ meetingId: UUID; canManage: boolean }>()
const confirm = useConfirm()
const router = useRouter()

const recordings = ref<MeetingRecording[]>([])
const loading = ref(true)
const error = ref('')
const playing = ref<UUID | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    recordings.value = await listRecordings(props.meetingId)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Tente novamente.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const day = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

async function remove(recording: MeetingRecording) {
  const ok = await confirm({
    title: 'Apagar gravação?',
    description: 'O vídeo é apagado do armazenamento e não pode ser recuperado.',
    confirmLabel: 'Apagar',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteRecording(props.meetingId, recording.id)
    recordings.value = recordings.value.filter((row) => row.id !== recording.id)
    toast.success('Gravação apagada.')
  } catch (cause) {
    toast.error(cause instanceof Error ? cause.message : 'Tente novamente.')
  }
}
</script>

<template>
  <div class="grid gap-3">
    <UiSkeleton v-if="loading" class="h-16 rounded-card" />
    <p v-else-if="error" role="alert" class="text-13 text-danger">
      {{ error }}
      <button type="button" class="cursor-pointer underline" @click="load">Tentar de novo</button>
    </p>
    <p v-else-if="!recordings.length" class="text-13 text-fg-muted">
      Esta reunião não foi gravada.
    </p>
    <ul v-else class="grid gap-3">
      <li
        v-for="recording in recordings"
        :key="recording.id"
        class="grid gap-3 rounded-card border border-border p-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <UiBadge :tone="RECORDING_STATUS[recording.status].tone">
            {{ RECORDING_STATUS[recording.status].label }}
          </UiBadge>
          <span class="text-13 text-fg">{{ day(recording.started_at) }}</span>
          <span v-if="recording.duration_seconds" class="text-13 text-fg-muted">
            · {{ formatDuration(recording.duration_seconds) }}
          </span>
          <span v-if="recording.size_bytes" class="text-13 text-fg-muted">
            · {{ formatSize(recording.size_bytes) }}
          </span>
          <UiBadge
            v-if="recording.insight_status && recording.insight_status !== 'done'"
            :tone="INSIGHT_STATUS[recording.insight_status].tone"
          >
            {{ INSIGHT_STATUS[recording.insight_status].label }}
          </UiBadge>
          <span class="flex-1" />
          <UiButton
            v-if="recording.status === 'ready'"
            size="sm"
            variant="ghost"
            :icon="Sparkles"
            @click="
              router.push({
                name: 'MeetingInsight',
                params: { meetingId: props.meetingId, recordingId: recording.id },
              })
            "
          >
            Resumo e transcrição
          </UiButton>
          <UiButton
            v-if="recording.play_url && playing !== recording.id"
            size="sm"
            @click="playing = recording.id"
          >
            Assistir
          </UiButton>
          <UiButton
            v-if="recording.download_url"
            size="sm"
            variant="ghost"
            :icon="Download"
            :href="recording.download_url"
          >
            Baixar
          </UiButton>
          <UiIconButton
            v-if="canManage"
            :icon="Trash2"
            size="sm"
            label="Apagar gravação"
            @click="remove(recording)"
          />
        </div>
        <video
          v-if="playing === recording.id && recording.play_url"
          :src="recording.play_url"
          controls
          autoplay
          class="aspect-video w-full rounded-control bg-surface-2"
          :aria-label="`Gravação de ${day(recording.started_at)}`"
        />
        <p v-if="recording.participants.length" class="text-12 text-fg-muted">
          Na sala: {{ recording.participants.map((p) => p.name || p.identity).join(', ') }}
        </p>
        <p v-if="recording.error" role="alert" class="text-12 text-danger">
          {{ recordingError(recording.error) }}
        </p>
        <p
          v-if="recording.status === 'processing'"
          class="flex items-center gap-2 text-12 text-fg-muted"
        >
          O vídeo aparece aqui quando o servidor terminar de processar.
          <UiButton size="sm" variant="ghost" :icon="RefreshCw" @click="load">Atualizar</UiButton>
        </p>
        <p v-if="recording.status === 'ready'" class="text-12 text-fg-muted">
          Apagada automaticamente em
          {{ new Date(recording.expires_at).toLocaleDateString('pt-BR') }}.
        </p>
      </li>
    </ul>
  </div>
</template>

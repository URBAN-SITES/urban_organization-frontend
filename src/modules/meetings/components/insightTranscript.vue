<script setup lang="ts">
import { Search } from '@lucide/vue'
import { computed, ref } from 'vue'
import { UiInput } from '@/shared/components'
import type { TranscriptSegment } from '../types'
import { clock, searchSegments } from '../utils'

/** Transcrição pesquisável; o horário de cada trecho leva ao player. */
const props = defineProps<{ segments: TranscriptSegment[]; current: number }>()
const emit = defineEmits<{ seek: [seconds: number] }>()

const query = ref('')
const visible = computed(() => searchSegments(props.segments, query.value))
const playing = (segment: TranscriptSegment) =>
  props.current >= segment.start && props.current < segment.end
</script>

<template>
  <div class="grid gap-3">
    <UiInput
      v-model="query"
      type="search"
      :icon="Search"
      placeholder="Buscar na transcrição"
      aria-label="Buscar na transcrição"
    />
    <p class="text-12 text-fg-muted" aria-live="polite">
      <template v-if="query.trim()">
        {{ visible.length }}
        {{ visible.length === 1 ? 'trecho encontrado' : 'trechos encontrados' }}
      </template>
      <template v-else>{{ segments.length }} trechos</template>
    </p>
    <p v-if="!visible.length" class="text-13 text-fg-muted">Nada encontrado para essa busca.</p>
    <ol v-else class="grid gap-1">
      <li
        v-for="segment in visible"
        :key="segment.id"
        :class="[
          'flex gap-3 rounded-control px-2 py-1.5 text-14',
          playing(segment) ? 'bg-surface-2' : '',
        ]"
      >
        <button
          type="button"
          class="shrink-0 cursor-pointer rounded-control font-mono text-13 text-fg-muted tabular-nums underline-offset-2 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent"
          :aria-label="`Ir para ${clock(segment.start)} no vídeo`"
          @click="emit('seek', segment.start)"
        >
          {{ clock(segment.start) }}
        </button>
        <span class="text-fg">{{ segment.text }}</span>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MeetingSummary, SummaryPoint, SummarySource } from '../types'
import { clock } from '../utils'

/** Resumo estruturado; cada item leva ao trecho no player. */
const props = defineProps<{ summary: MeetingSummary }>()
const emit = defineEmits<{ seek: [seconds: number] }>()

const sections = computed(() =>
  (
    [
      ['Decisões', props.summary.decisions],
      ['Problemas', props.summary.problems],
      ['Próximos passos', props.summary.next_steps],
      ['Perguntas em aberto', props.summary.open_questions],
    ] as [string, SummaryPoint[]][]
  ).filter(([, items]) => items.length),
)

const label = (source: SummarySource) => `Ir para ${clock(source.start)} no vídeo`
</script>

<template>
  <div class="grid gap-6">
    <section aria-labelledby="summary-exec">
      <h2 id="summary-exec" class="text-16 font-semibold text-fg">Resumo executivo</h2>
      <p class="mt-2 text-14 leading-relaxed text-fg">{{ summary.executive_summary }}</p>
    </section>

    <section v-if="summary.topics.length" aria-labelledby="summary-topics">
      <h2 id="summary-topics" class="text-16 font-semibold text-fg">Tópicos</h2>
      <ol class="mt-2 grid gap-1">
        <li v-for="(topic, index) in summary.topics" :key="index" class="flex gap-3 text-14">
          <button
            v-if="topic.source"
            type="button"
            class="shrink-0 cursor-pointer rounded-control font-mono text-13 text-fg-muted tabular-nums ui-link hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            :aria-label="label(topic.source)"
            @click="emit('seek', topic.source.start)"
          >
            {{ clock(topic.source.start) }}
          </button>
          <span class="text-fg">{{ topic.title }}</span>
        </li>
      </ol>
    </section>

    <section v-for="[title, items] in sections" :key="title" :aria-label="title" class="grid gap-2">
      <h2 class="text-16 font-semibold text-fg">{{ title }}</h2>
      <ul class="grid gap-2">
        <li v-for="(item, index) in items" :key="index" class="flex gap-3 text-14">
          <button
            v-if="item.source"
            type="button"
            class="shrink-0 cursor-pointer rounded-control font-mono text-13 text-fg-muted tabular-nums ui-link hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            :aria-label="label(item.source)"
            :title="item.source.quote"
            @click="emit('seek', item.source.start)"
          >
            {{ clock(item.source.start) }}
          </button>
          <span class="text-fg">{{ item.text }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

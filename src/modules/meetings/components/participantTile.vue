<script setup lang="ts">
import { MicOff, Monitor } from '@lucide/vue'
import type { Participant, TrackPublication } from 'livekit-client'
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { UiAvatar } from '@/shared/components'

/** Vídeo (câmera ou tela) de uma pessoa; sem vídeo, mostra o avatar. O som toca pela sala. */
const props = defineProps<{
  participant: Participant
  publication: TrackPublication | undefined
  screen: boolean
  /** muda a cada evento da sala */
  version: number
}>()

const video = useTemplateRef<HTMLVideoElement>('video')

const name = computed(() => props.participant.name || props.participant.identity)
const local = computed(() => props.participant.isLocal)
const videoTrack = computed(() => {
  void props.version
  const track = props.publication?.track
  return track && !props.publication?.isMuted ? track : undefined
})
const muted = computed(() => {
  void props.version
  return !props.participant.isMicrophoneEnabled
})
const speaking = computed(() => {
  void props.version
  return props.participant.isSpeaking && !props.screen
})

watch(
  [videoTrack, video],
  ([track, element], [previous, oldElement]) => {
    if (previous && oldElement) previous.detach(oldElement)
    if (track && element) track.attach(element)
  },
  { immediate: true, flush: 'post' },
)
onBeforeUnmount(() => {
  if (videoTrack.value && video.value) videoTrack.value.detach(video.value)
})
</script>

<template>
  <figure
    :class="[
      'relative grid aspect-video min-h-0 place-items-center overflow-hidden rounded-card border bg-surface-2',
      speaking ? 'border-accent' : 'border-border',
    ]"
  >
    <video
      v-show="videoTrack"
      ref="video"
      autoplay
      playsinline
      :muted="true"
      :class="[
        'h-full w-full',
        screen ? 'object-contain' : 'object-cover',
        local && !screen ? '-scale-x-100' : '',
      ]"
    />
    <UiAvatar v-if="!videoTrack" :name="name" size="lg" />
    <figcaption
      class="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-control border border-border bg-surface-1 px-2 py-1 text-12 text-fg"
    >
      <Monitor v-if="screen" :size="12" aria-hidden="true" />
      <MicOff v-else-if="muted" :size="12" aria-label="Microfone desligado" role="img" />
      <span class="truncate"
        >{{ screen ? `Tela de ${name}` : name }}{{ local ? ' (você)' : '' }}</span
      >
    </figcaption>
  </figure>
</template>

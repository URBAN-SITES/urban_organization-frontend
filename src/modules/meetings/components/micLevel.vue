<script setup lang="ts">
import { createAudioAnalyser, type LocalAudioTrack } from 'livekit-client'
import { onBeforeUnmount, ref, watch } from 'vue'

/** Barra que acompanha o volume do microfone: mostra que o som está sendo captado. */
const props = defineProps<{ track: LocalAudioTrack | undefined }>()

const level = ref(0)
let stop = () => {}

watch(
  () => props.track,
  (track) => {
    stop()
    level.value = 0
    if (!track) return
    const analyser = createAudioAnalyser(track, { cloneTrack: true })
    let frame = 0
    const tick = () => {
      // a fala fica perto de 0,1–0,3; o fator deixa a barra legível
      level.value = Math.min(1, analyser.calculateVolume() * 4)
      frame = requestAnimationFrame(tick)
    }
    tick()
    stop = () => {
      cancelAnimationFrame(frame)
      void analyser.cleanup()
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => stop())
</script>

<template>
  <div
    class="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
    role="meter"
    aria-label="Volume do microfone"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(level * 100)"
  >
    <div
      class="h-full rounded-full bg-success transition-[width] duration-75"
      :style="{ width: `${Math.round(level * 100)}%` }"
    />
  </div>
</template>

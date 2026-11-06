<script setup lang="ts">
import { Volume2 } from '@lucide/vue'
import type { LocalAudioTrack } from 'livekit-client'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { UiButton, UiSelect } from '@/shared/components'
import { type DeviceChoice, type DeviceKind, playTestSound } from '../composables/devices'
import MicLevel from './micLevel.vue'

/** Onde a reunião capta o som, onde toca e qual câmera usa. */
const props = defineProps<{
  lists: Record<DeviceKind, MediaDeviceInfo[]>
  choice: DeviceChoice
  canPickOutput: boolean
  /** microfone em uso, para o medidor */
  micTrack: LocalAudioTrack | undefined
}>()
const emit = defineEmits<{ pick: [kind: DeviceKind, deviceId: string] }>()

const options = (kind: DeviceKind, fallback: string) =>
  computed(() => [
    { value: '', label: 'Padrão do sistema' },
    ...props.lists[kind].map((device, index) => ({
      value: device.deviceId,
      label: device.label || `${fallback} ${index + 1}`,
    })),
  ])
const micOptions = options('audioinput', 'Microfone')
const speakerOptions = options('audiooutput', 'Alto-falante')
const cameraOptions = options('videoinput', 'Câmera')

const testing = ref(false)
async function testSpeaker() {
  testing.value = true
  try {
    await playTestSound(props.choice.audiooutput)
  } catch {
    toast.error('Não foi possível tocar o som de teste neste alto-falante.')
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="grid gap-4">
    <div class="grid gap-2">
      <UiSelect
        :model-value="choice.audioinput"
        :options="micOptions"
        label="Microfone"
        @update:model-value="emit('pick', 'audioinput', $event)"
      />
      <MicLevel :track="micTrack" />
      <p class="text-12 text-fg-muted">
        {{
          micTrack
            ? 'Fale algo: a barra verde mostra que o som está chegando.'
            : 'Ligue o microfone para ver o volume.'
        }}
      </p>
    </div>

    <div class="grid gap-2">
      <UiSelect
        v-if="canPickOutput"
        :model-value="choice.audiooutput"
        :options="speakerOptions"
        label="Alto-falante"
        @update:model-value="emit('pick', 'audiooutput', $event)"
      />
      <p v-else class="text-12 text-fg-muted">
        Este navegador usa sempre o alto-falante padrão do sistema. No Chrome e no Edge dá para
        escolher.
      </p>
      <UiButton size="sm" :icon="Volume2" :loading="testing" class="w-fit" @click="testSpeaker">
        Testar alto-falante
      </UiButton>
    </div>

    <UiSelect
      :model-value="choice.videoinput"
      :options="cameraOptions"
      label="Câmera"
      @update:model-value="emit('pick', 'videoinput', $event)"
    />
  </div>
</template>

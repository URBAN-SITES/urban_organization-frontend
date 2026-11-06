<script setup lang="ts">
import { computed } from 'vue'
import { useCallStore } from '../stores/call'
import ChatAvatar from './chatAvatar.vue'
import CallVideo from './callVideo.vue'

const calls = useCallStore()
const video = computed(() => calls.call?.kind === 'video')
const caller = computed(() => calls.call?.started_by?.name ?? 'Alguém')
const joined = computed(() => calls.others.filter((p) => p.state === 'joined'))
const label = computed(() => (video.value ? 'Chamada de vídeo' : 'Ligação de voz'))
const status = computed(() => {
  if (calls.phase === 'incoming') return `${label.value} de ${caller.value}`
  if (calls.phase === 'outgoing') return 'Chamando…'
  return joined.value.length ? `${label.value} em andamento` : 'Aguardando os outros…'
})

const controls = computed(() => [
  {
    id: 'mic',
    icon: calls.muted ? 'mic_off' : 'mic',
    label: calls.muted ? 'Ativar microfone' : 'Silenciar microfone',
    active: calls.muted,
    show: true,
    run: calls.toggleMute,
  },
  {
    id: 'camera',
    icon: calls.videoOff ? 'videocam_off' : 'videocam',
    label: calls.videoOff ? 'Ligar câmera' : 'Desligar câmera',
    active: calls.videoOff,
    show: video.value,
    run: calls.toggleVideo,
  },
  {
    id: 'screen',
    icon: calls.screenSharing ? 'stop_screen_share' : 'screen_share',
    label: calls.screenSharing ? 'Parar de compartilhar a tela' : 'Compartilhar a tela',
    active: calls.screenSharing,
    show: video.value && calls.canShareScreen && calls.phase === 'active',
    run: calls.toggleScreen,
  },
])
</script>

<template>
  <section
    v-if="calls.phase !== 'idle' && calls.call"
    class="fixed right-[16px] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-[12px] rounded-[16px] border border-border bg-surface-1 p-[14px] shadow-xl md:bottom-[16px]"
    :role="calls.phase === 'incoming' ? 'alertdialog' : 'region'"
    :aria-label="status"
  >
    <header class="flex items-center gap-[10px]">
      <ChatAvatar
        :name="calls.phase === 'incoming' ? caller : (calls.others[0]?.name ?? '')"
        :size="36"
      />
      <div class="min-w-0 flex-1 leading-normal">
        <p class="truncate text-[14px] font-semibold text-fg">
          {{ calls.others.map((p) => p.name).join(', ') }}
        </p>
        <p class="truncate text-[12px] text-fg-muted" aria-live="polite">{{ status }}</p>
      </div>
    </header>

    <div
      v-if="calls.phase === 'active' || (calls.phase === 'outgoing' && video)"
      :class="['grid gap-[6px]', joined.length > 1 ? 'grid-cols-2' : 'grid-cols-1']"
    >
      <div
        v-for="person in joined"
        :key="person.user_id"
        class="relative aspect-video overflow-hidden rounded-[10px] bg-black"
      >
        <CallVideo :stream="calls.remote[person.user_id] ?? null" />
        <span
          v-if="!video || person.video_off"
          class="absolute inset-0 grid place-items-center bg-surface-2"
        >
          <ChatAvatar :name="person.name" :size="48" />
        </span>
        <span
          class="absolute bottom-[6px] left-[6px] flex items-center gap-[4px] rounded-[6px] bg-black/60 px-[6px] py-[2px] text-[11px] text-white"
        >
          {{ person.name }}
          <span
            v-if="person.muted"
            class="material-symbols-outlined text-[13px]!"
            role="img"
            aria-label="microfone desligado"
            >mic_off</span
          >
          <span
            v-if="person.screen_sharing"
            class="material-symbols-outlined text-[13px]!"
            role="img"
            aria-label="compartilhando a tela"
            >screen_share</span
          >
        </span>
      </div>
      <div
        v-if="video && !calls.videoOff"
        class="relative aspect-video overflow-hidden rounded-[10px] bg-black"
      >
        <CallVideo :stream="calls.local" muted mirrored />
        <span
          class="absolute bottom-[6px] left-[6px] rounded-[6px] bg-black/60 px-[6px] py-[2px] text-[11px] text-white"
          >Você</span
        >
      </div>
    </div>

    <footer class="flex items-center justify-center gap-[10px]">
      <template v-if="calls.phase === 'incoming'">
        <button
          type="button"
          class="flex h-[40px] flex-1 cursor-pointer items-center justify-center gap-[6px] rounded-[10px] bg-danger text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          @click="calls.decline()"
        >
          <span class="material-symbols-outlined text-[18px]!" aria-hidden="true">call_end</span>
          Recusar
        </button>
        <button
          type="button"
          class="flex h-[40px] flex-1 cursor-pointer items-center justify-center gap-[6px] rounded-[10px] bg-success text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          @click="calls.accept()"
        >
          <span class="material-symbols-outlined text-[18px]!" aria-hidden="true">{{
            video ? 'videocam' : 'call'
          }}</span>
          Atender
        </button>
      </template>
      <template v-else>
        <template v-for="control in controls" :key="control.id">
          <button
            v-if="control.show"
            type="button"
            :class="[
              'grid size-[40px] cursor-pointer place-items-center rounded-full border transition-colors',
              control.active
                ? 'border-transparent bg-fg text-bg'
                : 'border-border text-fg hover:bg-surface-2',
            ]"
            :aria-label="control.label"
            :aria-pressed="control.active"
            :title="control.label"
            @click="control.run()"
          >
            <span class="material-symbols-outlined text-[20px]!" aria-hidden="true">{{
              control.icon
            }}</span>
          </button>
        </template>
        <button
          type="button"
          class="grid size-[40px] cursor-pointer place-items-center rounded-full bg-danger text-white transition-opacity hover:opacity-90"
          aria-label="Encerrar ligação"
          title="Encerrar ligação"
          @click="calls.hangup()"
        >
          <span class="material-symbols-outlined text-[20px]!" aria-hidden="true">call_end</span>
        </button>
      </template>
    </footer>

    <!-- ligação de voz: o áudio dos outros toca por aqui -->
    <template v-if="!video">
      <CallVideo
        v-for="person in joined"
        :key="`audio-${person.user_id}`"
        :stream="calls.remote[person.user_id] ?? null"
        class="hidden"
      />
    </template>
  </section>
</template>

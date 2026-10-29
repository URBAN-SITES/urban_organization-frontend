<script setup lang="ts">
import { computed } from 'vue'
import type { ChatChannel } from '../types'
import { formatListTime } from '../utils'
import ChatAvatar from './chatAvatar.vue'

const props = defineProps<{ channel: ChatChannel; active: boolean }>()

defineEmits<{ select: [] }>()

const preview = computed(() => {
  const last = props.channel.last_message
  if (!last) return 'Nenhuma mensagem ainda'
  // em canais, mostra o primeiro nome de quem escreveu
  return props.channel.kind === 'direct'
    ? last.content
    : `${last.author_name.split(' ')[0]}: ${last.content}`
})
</script>

<template>
  <button
    type="button"
    :aria-current="active ? 'true' : undefined"
    :class="[
      'mx-[8px] flex w-[calc(100%-16px)] cursor-pointer items-center gap-[10px] rounded-[10px] border border-l-2 border-l-transparent px-[10px] py-[9px] text-left transition-all duration-200',
      active
        ? 'border-accent/20 border-l-accent bg-accent/[0.06] shadow-[0_1px_3px_rgb(0_0_0/0.06)] dark:bg-accent/10'
        : 'border-transparent border-l-transparent hover:border-border-strong hover:bg-surface-2 dark:hover:bg-surface-2',
    ]"
    @click="$emit('select')"
  >
    <ChatAvatar v-if="channel.kind === 'direct'" :name="channel.name" :online="channel.online" />
    <span
      v-else
      :class="[
        'grid size-[32px] shrink-0 place-items-center rounded-[9px] border transition-colors',
        active
          ? 'border-accent/30 bg-accent/[0.08] text-accent dark:border-accent/35 dark:bg-accent/15'
          : 'border-border bg-surface-1 text-fg-muted dark:bg-black/20',
      ]"
      aria-hidden="true"
    >
      <span class="material-symbols-outlined text-[17px]!">tag</span>
    </span>

    <span class="flex min-w-0 flex-1 flex-col leading-normal">
      <span class="flex items-baseline gap-[8px]">
        <span class="flex-1 truncate text-[13.5px] font-semibold">{{ channel.name }}</span>
        <span v-if="channel.last_message" class="shrink-0 font-mono text-[10.5px] text-fg-muted">
          {{ formatListTime(channel.last_message.created_at) }}
        </span>
      </span>
      <span class="flex items-center gap-[8px]">
        <span class="flex-1 truncate text-[12px] text-fg-muted dark:text-fg-muted">{{
          preview
        }}</span>
        <span
          v-if="channel.unread_count"
          class="grid h-[16px] min-w-[16px] shrink-0 place-items-center rounded-full bg-accent px-[4px] text-[10px] leading-none font-semibold text-accent-fg"
          :aria-label="`${channel.unread_count} não lidas`"
        >
          {{ channel.unread_count }}
        </span>
      </span>
    </span>
  </button>
</template>

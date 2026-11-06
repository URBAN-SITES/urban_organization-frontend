<script setup lang="ts">
import { ref } from 'vue'
import type { ChatReaction } from '../types'

const QUICK = ['👍', '❤️', '😂', '🎉', '😮', '😢']

const props = defineProps<{ reactions: ChatReaction[]; me?: string; align?: 'start' | 'end' }>()
const emit = defineEmits<{ react: [emoji: string] }>()
const picking = ref(false)

function pick(emoji: string) {
  picking.value = false
  emit('react', emoji)
}

const mine = (reaction: ChatReaction) => !!props.me && reaction.user_ids.includes(props.me)
</script>

<template>
  <div
    :class="[
      'flex flex-wrap items-center gap-[4px]',
      align === 'end' ? 'justify-end' : 'justify-start',
    ]"
  >
    <button
      v-for="reaction in reactions"
      :key="reaction.emoji"
      type="button"
      :class="[
        'flex h-[24px] cursor-pointer items-center gap-[4px] rounded-full border px-[8px] text-[12px] transition-colors',
        mine(reaction)
          ? 'border-accent/40 bg-accent/10 text-fg'
          : 'border-border text-fg-muted hover:bg-surface-2',
      ]"
      :aria-pressed="mine(reaction)"
      :aria-label="`${reaction.emoji} ${reaction.user_ids.length}`"
      @click="pick(reaction.emoji)"
    >
      <span aria-hidden="true">{{ reaction.emoji }}</span>
      <span aria-hidden="true">{{ reaction.user_ids.length }}</span>
    </button>
    <div class="relative">
      <button
        type="button"
        class="grid h-[24px] w-[28px] cursor-pointer place-items-center rounded-full text-fg-muted opacity-60 transition-opacity hover:bg-surface-2 hover:opacity-100 focus-visible:opacity-100"
        aria-label="Reagir"
        title="Reagir"
        :aria-expanded="picking"
        @click="picking = !picking"
      >
        <span class="material-symbols-outlined text-[16px]!" aria-hidden="true">add_reaction</span>
      </button>
      <div
        v-if="picking"
        :class="[
          'absolute bottom-[28px] z-10 flex gap-[2px] rounded-full border border-border bg-surface-1 p-[4px] shadow-lg',
          align === 'end' ? 'right-0' : 'left-0',
        ]"
        role="menu"
        @keydown.esc="picking = false"
      >
        <button
          v-for="emoji in QUICK"
          :key="emoji"
          type="button"
          role="menuitem"
          class="grid size-[30px] cursor-pointer place-items-center rounded-full text-[16px] transition-transform hover:scale-125"
          :aria-label="`Reagir com ${emoji}`"
          @click="pick(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </div>
  </div>
</template>

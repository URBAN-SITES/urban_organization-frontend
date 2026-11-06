<script setup lang="ts">
import { computed } from 'vue'
import type { DemoMessage } from '../types'
import { formatTime } from '../utils'
import ChatAttachmentCard from './chatAttachmentCard.vue'
import ChatAvatar from './chatAvatar.vue'
import ChatReactions from './chatReactions.vue'
import ChatTaskCard from './chatTaskCard.vue'

const props = defineProps<{ message: DemoMessage; own: boolean; me?: string }>()
defineEmits<{ react: [emoji: string] }>()

const callIcon = computed(() => {
  const call = props.message.call
  if (!call) return ''
  if (call.status === 'missed' || call.status === 'declined') return 'phone_missed'
  return call.kind === 'video' ? 'videocam' : 'call'
})

// o backend grava o resumo em inglês; a tela monta o texto a partir dos dados da ligação
const callLabel = computed(() => {
  const call = props.message.call
  if (!call) return ''
  const name = call.kind === 'video' ? 'Chamada de vídeo' : 'Ligação de voz'
  if (call.status === 'missed') return `${name} perdida`
  if (call.status === 'declined') return `${name} recusada`
  return `${name} · ${Math.max(1, Math.round(call.duration_seconds / 60))} min`
})

type Part =
  | { kind: 'text' | 'mention'; text: string }
  | { kind: 'link'; text: string; href: string; to?: string }

const URL_PATTERN = /(https?:\/\/\S+)/

// link do próprio app abre sem recarregar; o da reunião da conversa vira um botão
function link(href: string): Part {
  try {
    const url = new URL(href)
    if (url.pathname.startsWith('/chat/sala/'))
      return { kind: 'link', text: 'Entrar na reunião', href, to: url.pathname }
    if (url.origin === window.location.origin)
      return { kind: 'link', text: href, href, to: url.pathname + url.search }
  } catch {
    /* parece link, mas não é uma URL válida */
  }
  return { kind: 'link', text: href, href }
}

// separa o texto nas menções (@Nome) e nos links para destacá-los
const parts = computed<Part[]>(() => {
  const names = props.message.mentions.map((mention) => `@${mention.name}`)
  const pieces = names.length
    ? props.message.content.split(
        new RegExp(
          `(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
        ),
      )
    : [props.message.content]
  return pieces.filter(Boolean).flatMap<Part>((text) =>
    names.includes(text)
      ? [{ kind: 'mention', text }]
      : text
          .split(URL_PATTERN)
          .filter(Boolean)
          .map((piece) => (URL_PATTERN.test(piece) ? link(piece) : { kind: 'text', text: piece })),
  )
})
</script>

<template>
  <article v-if="message.call" class="flex justify-center py-[6px]">
    <p
      :class="[
        'flex items-center gap-[6px] rounded-full border border-border px-[12px] py-[4px] text-[12px]',
        callIcon === 'phone_missed' ? 'text-danger' : 'text-fg-muted',
      ]"
    >
      <span class="material-symbols-outlined text-[16px]!" aria-hidden="true">{{ callIcon }}</span>
      {{ callLabel }} · {{ formatTime(message.created_at) }}
    </p>
  </article>

  <article v-else class="flex gap-[10px] py-[6px]" :class="own ? 'justify-end' : ''">
    <ChatAvatar v-if="!own" :name="message.author_name" :size="36" />
    <div
      :class="
        own
          ? 'flex max-w-[min(560px,85%)] flex-col items-end gap-[6px]'
          : 'flex min-w-0 flex-1 flex-col gap-[6px]'
      "
    >
      <p v-if="own" class="text-[11.5px] leading-normal text-fg-muted">
        Você · {{ formatTime(message.created_at) }}
      </p>
      <p v-else class="flex items-baseline gap-[8px] leading-normal">
        <span class="text-[13.5px] font-semibold">{{ message.author_name }}</span>
        <span class="text-[11.5px] text-fg-muted">{{ formatTime(message.created_at) }}</span>
      </p>
      <!-- só áudio ou só arquivo: sem balão vazio -->
      <p
        v-if="message.content"
        :class="
          own
            ? 'rounded-[12px] rounded-tr-[4px] bg-(--text-primary) px-[12px] py-[8px] text-[13.5px] leading-[20px] break-words text-white dark:bg-[#2e2c28]'
            : 'max-w-[640px] text-[13.5px] leading-[21px] break-words text-fg'
        "
      >
        <template v-for="(part, index) in parts" :key="index">
          <span
            v-if="part.kind === 'mention'"
            :class="own ? 'font-semibold underline' : 'font-medium text-(--chat-mention)'"
            >{{ part.text }}</span
          >
          <RouterLink
            v-else-if="part.kind === 'link' && part.to?.startsWith('/chat/sala/')"
            :to="part.to"
            class="mx-[2px] inline-flex items-center gap-[4px] rounded-[8px] bg-accent px-[10px] py-[3px] align-middle text-[12.5px] font-semibold text-accent-fg no-underline hover:brightness-105"
          >
            <span class="material-symbols-outlined text-[16px]!" aria-hidden="true">videocam</span>
            {{ part.text }}
          </RouterLink>
          <RouterLink
            v-else-if="part.kind === 'link' && part.to"
            :to="part.to"
            class="underline underline-offset-2"
            >{{ part.text }}</RouterLink
          >
          <a
            v-else-if="part.kind === 'link'"
            :href="part.href"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2"
            >{{ part.text }}</a
          >
          <template v-else>{{ part.text }}</template>
        </template>
      </p>
      <ChatTaskCard v-if="message.task" :task="message.task" />
      <ChatAttachmentCard v-for="file in message.attachments" :key="file.id" :file="file" />
      <ChatReactions
        :reactions="message.reactions"
        :me="me"
        :align="own ? 'end' : 'start'"
        @react="$emit('react', $event)"
      />
    </div>
    <ChatAvatar v-if="own" :name="message.author_name" variant="self" :size="36" />
  </article>
</template>

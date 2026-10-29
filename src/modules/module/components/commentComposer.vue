<script setup lang="ts">
import { Send } from '@lucide/vue'
import { computed, nextTick, ref, useId, useTemplateRef } from 'vue'
import { UiAvatar, UiButton } from '@/shared/components'
import type { Person } from '../types'
import { insertMention, keptMentions, mentionQuery, type MentionTarget } from '../utils/taskText'

/** Caixa de comentário com @menção: digite @ e escolha alguém com as setas e Enter. */
const props = defineProps<{ people: Person[]; sending: boolean }>()
const emit = defineEmits<{ submit: [content: string, mentions: string[]] }>()

const text = ref('')
const picked = ref<MentionTarget[]>([])
const query = ref<{ start: number; query: string } | null>(null)
const active = ref(0)
const area = useTemplateRef<HTMLTextAreaElement>('area')
const listId = useId()

const norm = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase()
const suggestions = computed(() => {
  if (!query.value) return []
  const needle = norm(query.value.query)
  return props.people
    .filter((person) => norm(`${person.name} ${person.email}`).includes(needle))
    .slice(0, 6)
})
const open = computed(() => suggestions.value.length > 0)

function update() {
  const el = area.value
  if (!el) return
  query.value = mentionQuery(el.value, el.selectionStart)
  active.value = 0
}

async function choose(person: Person) {
  const el = area.value
  if (!el || !query.value) return
  const name = person.name || person.email
  const result = insertMention(text.value, query.value.start, el.selectionStart, name)
  text.value = result.text
  picked.value = [...picked.value, { id: person.id, name }]
  query.value = null
  await nextTick()
  el.focus()
  el.setSelectionRange(result.caret, result.caret)
}

function onKeydown(event: KeyboardEvent) {
  if (open.value) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      active.value = (active.value + step + suggestions.value.length) % suggestions.value.length
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      void choose(suggestions.value[active.value]!)
      return
    }
    if (event.key === 'Escape') {
      event.stopPropagation()
      query.value = null
      return
    }
  }
  // Ctrl/Cmd+Enter envia
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    send()
  }
}

function send() {
  const content = text.value.trim()
  if (!content || props.sending) return
  emit('submit', content, keptMentions(content, picked.value))
}

/** chamado pelo pai depois de enviar com sucesso */
function reset() {
  text.value = ''
  picked.value = []
  query.value = null
}
defineExpose({ reset })
</script>

<template>
  <form class="relative grid gap-2" @submit.prevent="send">
    <label :for="`${listId}-input`" class="sr-only">Escrever comentário</label>
    <textarea
      :id="`${listId}-input`"
      ref="area"
      v-model="text"
      rows="3"
      maxlength="5000"
      placeholder="Escreva um comentário. Use @ para mencionar alguém."
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="open ? `${listId}-${active}` : undefined"
      class="w-full resize-y rounded-control border border-border bg-surface-2 px-3 py-2 text-14 text-fg placeholder:text-fg-muted hover:border-border-strong focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/40"
      @input="update"
      @click="update"
      @keydown="onKeydown"
    />
    <ul
      v-show="open"
      :id="listId"
      role="listbox"
      aria-label="Pessoas para mencionar"
      class="absolute bottom-full left-0 z-10 mb-1 w-64 rounded-card border border-border bg-surface-1 p-1 shadow-float"
    >
      <li
        v-for="(person, index) in suggestions"
        :id="`${listId}-${index}`"
        :key="person.id"
        role="option"
        :aria-selected="index === active"
        :class="[
          'flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-13',
          index === active ? 'bg-surface-2 text-fg' : 'text-fg-muted',
        ]"
        @mousedown.prevent="choose(person)"
      >
        <UiAvatar :name="person.name || person.email" size="xs" />
        <span class="min-w-0 flex-1 truncate">{{ person.name || person.email }}</span>
      </li>
    </ul>
    <div class="flex items-center justify-between gap-2">
      <span class="text-12 text-fg-muted">Ctrl + Enter envia</span>
      <UiButton type="submit" size="sm" :icon="Send" :loading="sending" :disabled="!text.trim()">
        Comentar
      </UiButton>
    </div>
  </form>
</template>

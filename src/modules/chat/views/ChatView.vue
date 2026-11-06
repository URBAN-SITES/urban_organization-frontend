<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { BaseButton, TopbarComp, UiErrorState } from '@/shared/components'
import { getErrorMessage } from '@/app/plugins/axios'
import { useAuthStore } from '@/modules/auth'
import { useOrganizationsStore } from '@/modules/organizations'
import {
  ChatAvatar,
  ChatChannelItem,
  ChatComposer,
  ChatDayDivider,
  ChatMessageItem,
  ChatPanelLayout,
  ChatSectionTitle,
  ChatToolButton,
  ChatTyping,
} from '../components'
import { useChatSocket } from '../composables/useChatSocket'
import { useVoiceRecorder } from '../composables/useVoiceRecorder'
import { useCallStore } from '../stores/call'
import { useChatStore } from '../stores/chat'
import type { ChatChannel, ChatMessage, DemoMessage } from '../types'
import { formatDayLabel } from '../utils'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const chat = useChatStore()
const calls = useCallStore()
const draft = ref('')
const scroller = useTemplateRef<HTMLElement>('scroller')

const me = computed(() => auth.user?.id)
const organization = computed(() => organizations.current)
// os eventos são tratados pelo layout (useChatAlerts); aqui só enviamos "digitando"
const { sendTyping } = useChatSocket()

const EMPTY_CHANNEL: ChatChannel = {
  id: '',
  kind: 'organization',
  name: '',
  team_id: null,
  team_ids: [],
  sector_id: null,
  unread_count: 0,
  member_count: 0,
  online: null,
  last_message: null,
}

const sectors = computed(() => chat.channels.filter((channel) => channel.kind !== 'direct'))
const directs = computed(() => chat.channels.filter((channel) => channel.kind === 'direct'))
const activeId = computed(() => chat.activeId ?? '')
const active = computed(() => chat.channels.find((c) => c.id === chat.activeId) ?? EMPTY_CHANNEL)
const typing = computed(() => chat.typing[activeId.value])
const items = computed(() => chat.messages[activeId.value] ?? [])

const subtitle = computed(() =>
  active.value.kind === 'direct'
    ? active.value.online
      ? 'Online agora'
      : 'Offline'
    : `${active.value.member_count} membros`,
)

// a API não manda o código da tarefa, só o card precisa dele
function toView(message: ChatMessage): DemoMessage {
  return {
    ...message,
    task: message.task && { ...message.task, code: `#${message.task.id.slice(0, 4)}` },
  }
}

// agrupa as mensagens por dia para mostrar os divisores "Ontem" / "Hoje"
const groups = computed(() => {
  const result: { label: string; items: DemoMessage[] }[] = []
  for (const item of items.value) {
    const label = formatDayLabel(item.created_at)
    const last = result.at(-1)
    if (last?.label === label) last.items.push(toView(item))
    else result.push({ label, items: [toView(item)] })
  }
  return result
})

async function scrollToEnd() {
  await nextTick()
  scroller.value?.parentElement?.scrollTo({ top: scroller.value.parentElement.scrollHeight })
}

function select(channel: ChatChannel) {
  void chat.select(channel.id)
}

function selectFromPicker(event: Event) {
  const id = (event.currentTarget as HTMLSelectElement).value
  const channel = chat.channels.find((item) => item.id === id)
  if (channel) select(channel)
}

// @menção: sugere membros da organização enquanto você digita "@nome"
const mentioned = ref(new Map<string, string>()) // id -> nome
const mentionQuery = computed(() => /(?:^|\s)@([^\s@]*)$/.exec(draft.value)?.[1] ?? null)
const mentionOptions = computed(() => {
  const query = mentionQuery.value?.toLowerCase()
  if (query === undefined) return []
  return organizations.members
    .filter((m) => m.user_id !== auth.user?.id && m.name.toLowerCase().includes(query))
    .slice(0, 6)
})

function startMention() {
  if (mentionQuery.value === null)
    draft.value += `${draft.value && !/\s$/.test(draft.value) ? ' ' : ''}@`
}

function pickMention(member: { user_id: string; name: string }) {
  draft.value = draft.value.replace(/@[^\s@]*$/, `@${member.name} `)
  mentioned.value.set(member.user_id, member.name)
}

const MAX_FILES = 5 // limites do backend
const MAX_BYTES = 10 * 1024 * 1024
const files = ref<File[]>([])
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

function pickFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = [...(input.files ?? [])]
  input.value = ''
  if (files.value.length + picked.length > MAX_FILES)
    return void toast.error(`Envie no máximo ${MAX_FILES} arquivos por mensagem.`)
  if (picked.some((file) => file.size > MAX_BYTES))
    return void toast.error('Cada arquivo pode ter no máximo 10 MB.')
  files.value.push(...picked)
}

async function send() {
  const content = draft.value
  const attached = files.value
  if (!content.trim() && !attached.length) return
  const mentions = [...mentioned.value].filter(([, name]) => content.includes(`@${name}`))
  draft.value = ''
  files.value = []
  mentioned.value = new Map()
  await chat.send(content, { files: attached, mentions: mentions.map(([id]) => id) })
}

// Reunião da conversa (LiveKit, igual às reuniões dos projetos): avisa no canal e abre a sala
const startingMeeting = ref(false)
async function startMeet() {
  const channelId = chat.activeId
  if (!channelId || startingMeeting.value) return
  startingMeeting.value = true
  try {
    const { error } = await chat.meet()
    if (error) return void toast.error(error)
    await router.push({ name: 'ChannelRoom', params: { channelId } })
  } finally {
    startingMeeting.value = false
  }
}

// mensagem de voz: grava, mostra o tempo e envia como anexo de áudio
const VOICE_MAX_SECONDS = 5 * 60 // ~1 MB em opus, longe do limite de 10 MB
const voice = useVoiceRecorder()
const voiceTime = computed(() => {
  const s = voice.seconds.value
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
async function startVoice() {
  if (!(await voice.start()))
    toast.error('Não foi possível gravar. Permita o acesso ao microfone neste site.')
}
async function sendVoice() {
  const file = await voice.stop()
  if (file) await chat.send('', { files: [file] })
}
watch(voice.seconds, (s) => {
  if (s >= VOICE_MAX_SECONDS) void sendVoice()
})
// trocar de conversa no meio da gravação descarta o áudio, para não ir ao canal errado
watch(
  () => chat.activeId,
  () => voice.cancel(),
)

// chamadas WebRTC são para conversas pequenas; acima disso, use a reunião (limite do backend)
const CALL_MAX_PEOPLE = 6
const canCall = computed(
  () =>
    !!active.value.id &&
    active.value.member_count > 1 &&
    active.value.member_count <= CALL_MAX_PEOPLE &&
    calls.phase === 'idle',
)

let lastTyping = 0
watch(draft, (value) => {
  if (!value || !chat.activeId || Date.now() - lastTyping < 2000) return
  lastTyping = Date.now()
  sendTyping(chat.activeId)
})

const loadError = ref('')
const loading = ref(false)
// the store keeps chat.error after a failed channel list; without channels there is nothing to show
const failure = computed(() => loadError.value || (chat.channels.length ? '' : chat.error))

async function init() {
  loadError.value = ''
  loading.value = true
  try {
    if (!auth.user) await auth.loadUser() // a full reload on /chat has no user yet
    if (!organizations.organizations.length) await organizations.load()
    const org = organization.value
    if (!org || !me.value) return
    chat.reset() // never show another account's conversations
    await organizations.loadMembers(org.id)
    const others = organizations.members.map((m) => m.user_id).filter((id) => id !== me.value)
    await chat.load(org.id, others)
    // vindo de um link (ex.: "Voltar à conversa" da reunião), abre a conversa certa
    const wanted = route.query.canal
    if (typeof wanted === 'string' && chat.channels.some((c) => c.id === wanted))
      await chat.select(wanted)
  } catch (e) {
    loadError.value = getErrorMessage(e, 'Tente de novo em instantes.')
  } finally {
    loading.value = false
  }
}

onMounted(init)

// trocou a organização selecionada: o chat passa a ser o dela
watch(
  () => organization.value?.id,
  (id, previous) => {
    if (previous && id && id !== previous) void init()
  },
)

watch(() => [chat.activeId, items.value.length], scrollToEnd, { immediate: true })
</script>

<template>
  <div class="flex h-[calc(100dvh-3.75rem)] md:h-dvh w-full min-w-0 flex-col bg-bg">
    <TopbarComp
      :crumbs="['Mensagens', active.kind === 'direct' ? active.name : `#${active.name}`]"
    />

    <div
      class="uo-backdrop flex min-h-0 flex-1 flex-col px-[20px] py-[12px] sm:px-[32px] sm:py-[20px] lg:px-[40px] lg:py-[28px]"
    >
      <UiErrorState
        v-if="failure"
        title="Não foi possível abrir as mensagens"
        :description="failure"
        :retrying="loading"
        class="my-auto"
        @retry="init"
      />
      <ChatPanelLayout v-else>
        <template #aside>
          <h2 class="px-[18px] pt-[18px] text-16 font-semibold text-fg">Mensagens</h2>

          <ChatSectionTitle>Canais por setor</ChatSectionTitle>
          <nav aria-label="Canais por setor" class="flex flex-col gap-[2px]">
            <ChatChannelItem
              v-for="channel in sectors"
              :key="channel.id"
              :channel="channel"
              :active="channel.id === activeId"
              @select="select(channel)"
            />
          </nav>

          <ChatSectionTitle>Mensagens diretas</ChatSectionTitle>
          <nav aria-label="Mensagens diretas" class="flex flex-col gap-[2px] pb-[12px]">
            <ChatChannelItem
              v-for="channel in directs"
              :key="channel.id"
              :channel="channel"
              :active="channel.id === activeId"
              @select="select(channel)"
            />
          </nav>
        </template>

        <template #header>
          <span
            v-if="active.kind !== 'direct'"
            class="grid size-[32px] shrink-0 place-items-center rounded-[9px] border border-accent/25 bg-accent/[0.08] text-accent dark:bg-accent/15"
            aria-hidden="true"
          >
            <span class="material-symbols-outlined text-[18px]!">tag</span>
          </span>
          <div class="flex min-w-0 flex-1 flex-col leading-normal">
            <h1 class="truncate text-16 font-semibold text-fg">
              {{ active.name }}
            </h1>
            <p class="truncate text-[12px] text-fg-muted">{{ subtitle }}</p>
          </div>
          <template v-if="canCall">
            <button
              v-for="option in [
                { kind: 'audio', icon: 'call', label: 'Ligação de voz' },
                { kind: 'video', icon: 'videocam', label: 'Chamada de vídeo' },
              ] as const"
              :key="option.kind"
              type="button"
              class="grid size-[34px] shrink-0 cursor-pointer place-items-center rounded-[10px] border border-border transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-2 hover:text-fg active:translate-y-0 dark:hover:bg-surface-2"
              :aria-label="option.label"
              :title="option.label"
              @click="calls.start(active.id, option.kind)"
            >
              <span class="material-symbols-outlined text-[18px]!" aria-hidden="true">{{
                option.icon
              }}</span>
            </button>
          </template>
          <BaseButton
            variant="primary"
            label="Iniciar reunião"
            icon="video_call"
            icon-position="left"
            size="sm"
            :full-width="false"
            :disabled="!active.id || startingMeeting"
            title="Abre uma sala de vídeo da conversa e avisa os membros"
            @click="startMeet"
            class="mt-0! inline-flex rounded-[10px]! h-[34px]! gap-[6px]! px-[12px]! py-0! text-[13px]! [&_.material-symbols-outlined]:text-[17px]!"
          />
          <select
            :value="activeId"
            aria-label="Selecionar canal ou mensagem direta"
            class="h-[36px] w-full basis-full min-w-0 rounded-[9px] border border-border bg-surface-1 px-[10px] text-[13px] text-fg outline-none focus:border-accent md:hidden"
            @change="selectFromPicker"
          >
            <option value="" disabled>Selecionar conversa</option>
            <optgroup v-if="sectors.length" label="Canais por setor">
              <option v-for="channel in sectors" :key="channel.id" :value="channel.id">
                # {{ channel.name }}
              </option>
            </optgroup>
            <optgroup v-if="directs.length" label="Mensagens diretas">
              <option v-for="channel in directs" :key="channel.id" :value="channel.id">
                {{ channel.name }}
              </option>
            </optgroup>
          </select>
        </template>

        <div ref="scroller" aria-live="polite">
          <template v-for="group in groups" :key="group.label">
            <ChatDayDivider :label="group.label" />
            <ChatMessageItem
              v-for="item in group.items"
              :key="item.id"
              :message="item"
              :own="item.author_id === me"
              :me="me"
              @react="chat.react(item.id, $event)"
            />
          </template>
          <p v-if="!groups.length" class="py-[40px] text-center text-[13px] text-fg-muted">
            Nenhuma mensagem ainda. Comece a conversa!
          </p>
          <ChatTyping v-if="typing" :name="typing" />
        </div>

        <template #footer>
          <ul
            v-if="mentionOptions.length"
            class="mb-[6px] grid gap-[2px] rounded-[10px] border border-border bg-surface-1 p-[4px]"
            role="listbox"
            aria-label="Mencionar membro"
          >
            <li v-for="member in mentionOptions" :key="member.user_id" role="option">
              <button
                type="button"
                class="flex w-full cursor-pointer items-center gap-[8px] rounded-[7px] px-[8px] py-[6px] text-left text-[13px] transition-colors hover:bg-surface-2 hover:text-fg dark:hover:bg-surface-2"
                @click="pickMention(member)"
              >
                <ChatAvatar :name="member.name" :size="24" />
                {{ member.name }}
              </button>
            </li>
          </ul>
          <ChatComposer
            v-model="draft"
            :placeholder="`Mensagem para ${active.kind === 'direct' ? active.name : `#${active.name}`} · use @ para mencionar e # para citar uma tarefa`"
            submit-label="Enviar"
            submit-icon="chat_bubble"
            @submit="send"
          >
            <template #tools>
              <input
                ref="fileInput"
                type="file"
                multiple
                class="sr-only"
                tabindex="-1"
                aria-label="Arquivos da mensagem"
                @change="pickFiles"
              />
              <span
                v-if="voice.recording.value"
                class="flex items-center gap-[6px] rounded-[8px] bg-danger/10 py-[2px] pr-[2px] pl-[8px] text-[12px] text-danger"
                role="status"
                aria-live="polite"
              >
                <span class="size-[8px] animate-pulse rounded-full bg-danger" aria-hidden="true" />
                Gravando {{ voiceTime }}
                <button
                  type="button"
                  class="grid size-[26px] cursor-pointer place-items-center rounded-[6px] text-fg-muted hover:bg-surface-2 hover:text-fg"
                  aria-label="Descartar áudio"
                  title="Descartar áudio"
                  @click="voice.cancel()"
                >
                  <span class="material-symbols-outlined text-[16px]!" aria-hidden="true"
                    >delete</span
                  >
                </button>
                <button
                  type="button"
                  class="grid size-[26px] cursor-pointer place-items-center rounded-[6px] bg-accent text-accent-fg hover:brightness-105"
                  aria-label="Enviar áudio"
                  title="Enviar áudio"
                  @click="sendVoice"
                >
                  <span class="material-symbols-outlined text-[16px]!" aria-hidden="true"
                    >send</span
                  >
                </button>
              </span>
              <ChatToolButton
                v-else
                icon="mic"
                label="Gravar mensagem de voz"
                @click="startVoice"
              />
              <ChatToolButton
                icon="attach_file"
                label="Anexar arquivo"
                @click="fileInput?.click()"
              />
              <span
                v-for="(file, index) in files"
                :key="index"
                class="flex max-w-[160px] items-center gap-[4px] rounded-[6px] bg-surface-2 py-[2px] pr-[2px] pl-[8px] text-[12px] dark:bg-white/10"
              >
                <span class="truncate">{{ file.name }}</span>
                <button
                  type="button"
                  class="grid size-[20px] cursor-pointer place-items-center"
                  :aria-label="`Remover ${file.name}`"
                  @click="files.splice(index, 1)"
                >
                  <span class="material-symbols-outlined text-[14px]!" aria-hidden="true"
                    >close</span
                  >
                </button>
              </span>
              <ChatToolButton
                icon="alternate_email"
                label="Mencionar alguém"
                @click="startMention"
              />
              <button
                type="button"
                class="grid size-[30px] cursor-pointer place-items-center rounded-[8px] text-fg-muted transition-all duration-200 hover:bg-surface-2 hover:text-fg"
                aria-label="Criar tarefas com IA"
                title="Criar tarefas com IA"
                @click="router.hasRoute('Assistant') && router.push({ name: 'Assistant' })"
              >
                <span
                  class="material-symbols-outlined text-[18px]! text-(--chat-ai)"
                  aria-hidden="true"
                  >auto_awesome</span
                >
              </button>
            </template>
          </ChatComposer>
        </template>
      </ChatPanelLayout>
    </div>
  </div>
</template>

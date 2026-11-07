<script setup lang="ts">
import {
  CalendarClock,
  Check,
  Copy,
  FileSearch,
  FolderKanban,
  History,
  ListChecks,
  MessageSquare,
  Paperclip,
  Plus,
  Sparkles,
  SquarePen,
  TrendingUp,
  Trash2,
  TriangleAlert,
} from '@lucide/vue'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { toast } from 'vue-sonner'
import { BaseButton } from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { useAuthStore } from '@/modules/auth'
import {
  aiActionDeleted,
  aiActionDraft,
  aiActionLabel,
  aiActionNotes,
  aiActionTasks,
  aiActionTone,
  aiErrorDetails,
  aiVisibleActions,
  useAiStore,
} from '@/modules/ai'
import type { AiTask } from '@/modules/ai'
import AiBrandName from './aiBrandName.vue'
import AiMarkdown from './aiMarkdown.vue'
import AssistantTaskCard from './assistantTaskCard.vue'
import AssistantTaskDraft from './assistantTaskDraft.vue'
import ChatAvatar from './chatAvatar.vue'
import ChatComposer from './chatComposer.vue'
import ChatToolButton from './chatToolButton.vue'
import { formatSize, formatTime } from '../utils'

/**
 * Conversa com a Urban AI: a geral (todos os projetos) ou a de um projeto, que manda o
 * projeto como contexto e guarda conversas separadas.
 */
const props = defineProps<{
  organizationId: string | null | undefined
  /** projeto aberto; sem ele a IA olha todos os projetos */
  sectorId?: string | null
  sectorName?: string
}>()

const auth = useAuthStore()
const ai = useAiStore()
const draft = ref('')
const files = ref<File[]>([])
const scroller = useTemplateRef<HTMLElement>('scroller')
const fileInput = useTemplateRef<HTMLInputElement>('file-input')
const composerDisabled = computed(() => ai.isBusy || !!ai.active?.pending || !!ai.active?.expired)
const firstName = computed(() => auth.user?.name?.split(/\s+/)[0] || '')
const where = computed(() =>
  props.sectorName ? `do projeto ${props.sectorName}` : 'dos meus projetos',
)

watch(
  () => auth.user?.id ?? null,
  (id) => {
    ai.setOwner(id)
    draft.value = ''
    clearFiles()
  },
  { immediate: true, flush: 'sync' },
)
watch(
  () => props.sectorId || 'all',
  (scope) => {
    ai.setScope(scope)
    void ai.loadThreads()
  },
  { immediate: true },
)
watch(
  () => ai.error,
  (message) => {
    if (message) toast.error(message)
  },
)

async function scrollToEnd() {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
}
watch(() => [ai.activeId, ai.messages.length, ai.isBusy], scrollToEnd, { immediate: true })

/** Atalhos: pedidos completos vão direto; "Criar tarefa" só prepara o texto. */
const tools = computed(() => [
  {
    icon: ListChecks,
    label: 'Planejar tarefas',
    prompt: `Monte um plano de trabalho ${where.value} com etapas, prazos sugeridos e um checklist do que falta.`,
  },
  {
    icon: TrendingUp,
    label: 'Resumir andamento',
    prompt: `Resuma o andamento ${where.value}: o que foi concluído, o que está em andamento, o que está parado e os riscos.`,
  },
  {
    icon: TriangleAlert,
    label: 'Tarefas atrasadas',
    prompt: `Quais tarefas ${where.value} estão atrasadas? Mostre em uma tabela com responsável e prazo.`,
  },
  {
    icon: CalendarClock,
    label: 'Prioridades da semana',
    prompt: `Quais devem ser as prioridades desta semana ${where.value}? Organize por urgência.`,
  },
  { icon: SquarePen, label: 'Criar tarefa', prompt: 'Crie uma tarefa para ', fill: true },
  { icon: FileSearch, label: 'Analisar arquivo', file: true },
])
const starters = computed(() => tools.value.slice(0, 4))

function useTool(tool: (typeof tools.value)[number]) {
  if (tool.file) return fileInput.value?.click()
  if (!tool.prompt) return
  if (tool.fill) {
    draft.value = tool.prompt
    return
  }
  void ai.ask(tool.prompt, props.organizationId, props.sectorId)
}

function taskDelete(task: AiTask) {
  // a exclusão passa pelo assistente para o servidor emitir a confirmação de uso único
  void ai.ask(
    `Exclua a tarefa "${task.title}" (id ${task.id}).`,
    props.organizationId,
    props.sectorId,
  )
}

function clearFiles() {
  files.value = []
  if (fileInput.value) fileInput.value.value = ''
}
function selectFiles() {
  files.value = Array.from(fileInput.value?.files ?? [])
}
function newConversation() {
  ai.newConversation()
  draft.value = ''
  clearFiles()
}
function openHistory(id: string) {
  void ai.open(id)
  draft.value = ''
  clearFiles()
}
async function send() {
  if (await ai.ask(draft.value, props.organizationId, props.sectorId)) draft.value = ''
}
async function retry() {
  if (await ai.retry()) draft.value = ''
}
async function analyze() {
  if (await ai.analyze([...files.value])) clearFiles()
}

const confirm = useConfirm()
async function removeHistory(id: string, title: string) {
  const ok = await confirm({
    title: 'Apagar esta conversa?',
    description: `"${title}" sai do histórico. Tarefas e mudanças feitas pela IA continuam.`,
    confirmLabel: 'Apagar',
  })
  if (ok) await ai.remove(id)
}

const day = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'agora'

const copied = ref('')
async function copyAnswer(id: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = id
    window.setTimeout(() => (copied.value = ''), 1500)
  } catch {
    toast.error('Não foi possível copiar.')
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 gap-4">
    <!-- conversa ---------------------------------------------------------------->
    <section
      class="ai-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface-1"
      aria-label="Conversa com a Urban AI"
    >
      <header
        class="flex items-center gap-3 border-b border-border bg-linear-to-r from-accent/[0.07] to-transparent px-4 py-3"
      >
        <ChatAvatar name="Urban AI" variant="ai" :size="32" />
        <div class="min-w-0 flex-1 leading-tight">
          <h2 class="font-semibold"><AiBrandName class="text-[15px]" /></h2>
          <p class="truncate text-12 text-fg-muted">
            {{ sectorName ? `Projeto ${sectorName}` : 'Todos os seus projetos' }}
          </p>
        </div>
        <select
          :value="ai.activeId ?? ''"
          aria-label="Conversas anteriores"
          :disabled="ai.isBusy || !ai.scoped.length"
          class="h-8 max-w-[45%] rounded-control border border-border bg-surface-1 px-2 text-12 lg:hidden"
          @change="openHistory(($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>Conversas</option>
          <option v-for="item in ai.scoped" :key="item.id" :value="item.id">
            {{ item.title }}
          </option>
        </select>
        <button
          type="button"
          class="grid size-8 cursor-pointer place-items-center rounded-control text-fg-muted hover:bg-surface-2 hover:text-fg lg:hidden"
          aria-label="Nova conversa"
          :disabled="ai.isBusy"
          @click="newConversation"
        >
          <Plus :size="16" aria-hidden="true" />
        </button>
      </header>

      <div
        ref="scroller"
        class="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        aria-live="polite"
        :aria-busy="ai.isBusy"
      >
        <!-- boas-vindas -->
        <div v-if="!ai.messages.length" class="mx-auto flex max-w-2xl flex-col gap-5 py-6">
          <div class="flex items-start gap-3">
            <ChatAvatar name="Urban AI" variant="ai" :size="44" />
            <div>
              <p class="text-20 font-semibold">Olá{{ firstName ? `, ${firstName}` : '' }}! 👋</p>
              <p class="text-14 text-fg-muted">
                Sou o assistente de IA da Urban.
                {{
                  sectorName
                    ? `Estou olhando o projeto ${sectorName}.`
                    : 'Posso olhar todos os seus projetos.'
                }}
                Como posso te ajudar hoje?
              </p>
            </div>
          </div>
          <div class="grid gap-2 sm:grid-cols-2">
            <button
              v-for="tool in starters"
              :key="tool.label"
              type="button"
              :disabled="composerDisabled"
              class="ai-starter flex cursor-pointer items-center gap-2 rounded-card border border-accent/40 bg-accent/[0.04] px-3 py-2.5 text-left text-13 font-medium transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              @click="useTool(tool)"
            >
              <component
                :is="tool.icon"
                :size="16"
                class="shrink-0 text-accent"
                aria-hidden="true"
              />
              {{ tool.label }}
            </button>
          </div>
        </div>

        <div class="mx-auto flex max-w-3xl flex-col gap-6">
          <template v-for="entry in ai.messages" :key="entry.id">
            <!-- pedido -->
            <article v-if="entry.role === 'user'" class="flex flex-col items-end gap-1">
              <p
                class="max-w-[min(560px,90%)] whitespace-pre-wrap rounded-card rounded-tr-md border border-accent/60 bg-accent/[0.08] px-4 py-2.5 text-14 leading-relaxed"
              >
                {{ entry.content }}
              </p>
              <p
                v-for="file in entry.files"
                :key="file.name"
                class="max-w-full break-all text-12 text-fg-muted"
              >
                <Paperclip :size="12" class="inline" aria-hidden="true" /> {{ file.name }} ·
                {{ formatSize(file.size) }}
              </p>
              <p class="text-11 text-fg-muted">{{ formatTime(entry.created_at) }}</p>
              <p v-if="entry.error" role="alert" class="text-12 text-danger">{{ entry.error }}</p>
            </article>

            <!-- resposta -->
            <article v-else class="flex gap-3">
              <ChatAvatar name="Urban AI" variant="ai" :size="34" class="shrink-0" />
              <div class="flex min-w-0 flex-1 flex-col gap-3">
                <div
                  class="rounded-card border border-border bg-surface-2/60 px-4 py-3 shadow-[0_1px_2px_rgb(0_0_0/0.05)]"
                >
                  <AiMarkdown :text="entry.content" />
                </div>
                <div class="flex items-center gap-2 text-11 text-fg-muted">
                  <span>{{ formatTime(entry.created_at) }}</span>
                  <button
                    type="button"
                    class="inline-flex cursor-pointer items-center gap-1 rounded-control px-1.5 py-0.5 hover:bg-surface-2 hover:text-fg"
                    @click="copyAnswer(entry.id, entry.content)"
                  >
                    <component
                      :is="copied === entry.id ? Check : Copy"
                      :size="12"
                      aria-hidden="true"
                    />
                    {{ copied === entry.id ? 'Copiado' : 'Copiar' }}
                  </button>
                </div>

                <div
                  v-for="(action, index) in aiVisibleActions(entry.actions)"
                  :key="`${action.action}-${index}`"
                  class="flex flex-col gap-2"
                >
                  <AssistantTaskDraft
                    v-if="aiActionDraft(action)"
                    :draft="aiActionDraft(action)!"
                    :state="ai.drafts[`${entry.id}:${index}`]"
                    :disabled="ai.isBusy || !!ai.active?.expired"
                    @confirm="(payload) => ai.confirmDraft(`${entry.id}:${index}`, payload)"
                    @discard="ai.discardDraft(`${entry.id}:${index}`)"
                  />
                  <p
                    v-else-if="aiActionTone(action) === 'error'"
                    role="alert"
                    class="text-12 text-danger"
                  >
                    {{ aiActionLabel(action) }} não realizada:
                    {{
                      aiErrorDetails(action.error) ||
                      (action.status === 'uncertain'
                        ? 'resultado incerto, confira antes de tentar de novo.'
                        : 'tente novamente.')
                    }}
                  </p>
                  <p
                    v-else-if="aiActionTone(action) === 'pending'"
                    class="text-12 font-medium text-danger"
                  >
                    Exclusão pendente: nada foi apagado ainda. Confirme abaixo.
                  </p>
                  <!-- consultas: a resposta já resume; os cartões ficam recolhidos -->
                  <details
                    v-else-if="!action.writes && aiActionTasks(action).length"
                    class="group rounded-card border border-border px-3 py-2"
                  >
                    <summary
                      class="flex cursor-pointer list-none items-center gap-1.5 text-12 text-fg-muted hover:text-fg"
                    >
                      <ListChecks :size="13" aria-hidden="true" />
                      Ver {{ aiActionTasks(action).length }}
                      {{
                        aiActionTasks(action).length === 1
                          ? 'tarefa consultada'
                          : 'tarefas consultadas'
                      }}
                    </summary>
                    <div class="mt-2 flex flex-col gap-2">
                      <AssistantTaskCard
                        v-for="task in aiActionTasks(action).slice(0, 20)"
                        :key="task.id"
                        :task="task"
                        :disabled="ai.isBusy || !!ai.active?.pending || !!ai.active?.expired"
                        @delete="taskDelete"
                      />
                    </div>
                  </details>
                  <template v-else-if="action.writes">
                    <p class="inline-flex items-center gap-1 text-12 font-medium text-success">
                      <Check :size="13" aria-hidden="true" /> {{ aiActionLabel(action) }}
                    </p>
                    <p v-if="aiActionDeleted(action)" class="text-12 text-fg-muted">
                      Removido com sucesso.
                    </p>
                    <AssistantTaskCard
                      v-for="task in aiActionTasks(action).slice(0, 8)"
                      :key="task.id"
                      :task="task"
                      :disabled="ai.isBusy || !!ai.active?.pending || !!ai.active?.expired"
                      @delete="taskDelete"
                    />
                    <p
                      v-for="note in aiActionNotes(action)"
                      :key="note"
                      class="text-12 text-fg-muted"
                    >
                      ℹ {{ note }}
                    </p>
                  </template>
                </div>

                <div
                  v-if="entry.choices?.length && entry.id === ai.messages.at(-1)?.id"
                  class="flex flex-wrap gap-1.5"
                >
                  <button
                    v-for="choice in entry.choices"
                    :key="choice"
                    type="button"
                    :disabled="composerDisabled"
                    class="h-8 cursor-pointer rounded-full border border-accent/60 px-3 text-12 text-fg transition-colors hover:bg-accent hover:text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
                    @click="ai.ask(choice, organizationId, sectorId)"
                  >
                    {{ choice }}
                  </button>
                </div>

                <div
                  v-if="
                    entry.confirmation_token &&
                    entry.confirmation_token === ai.active?.confirmation_token
                  "
                  class="flex flex-wrap items-center gap-2"
                >
                  <BaseButton
                    variant="destructive"
                    label="Confirmar exclusão"
                    size="sm"
                    :full-width="false"
                    :disabled="ai.isBusy || !!ai.active?.pending"
                    class="mt-0!"
                    @click="ai.confirmDeletion()"
                  />
                  <BaseButton
                    variant="secondary"
                    label="Cancelar exclusão"
                    size="sm"
                    :full-width="false"
                    :disabled="ai.isBusy || !!ai.active?.pending"
                    class="mt-0!"
                    @click="ai.ask('Cancele a exclusão pendente.', organizationId, sectorId)"
                  />
                </div>

                <a
                  v-if="entry.report"
                  :href="entry.report.url"
                  :download="entry.report.file_name"
                  class="flex w-fit items-center gap-1.5 rounded-control bg-accent px-3 py-2 text-13 font-medium text-accent-fg hover:brightness-105"
                >
                  Baixar relatório PDF
                </a>
              </div>
            </article>
          </template>

          <div v-if="ai.isBusy" role="status" class="flex items-center gap-3 text-13 text-fg-muted">
            <ChatAvatar name="Urban AI" variant="ai" :size="34" />
            <span class="ai-typing" aria-hidden="true"><i /><i /><i /></span>
            {{ ai.isAnalyzing ? 'Analisando os arquivos…' : 'Pensando…' }}
          </div>
          <div
            v-if="ai.active?.pending && !ai.isBusy"
            class="flex flex-wrap items-center gap-3 text-12 text-fg-muted"
          >
            A resposta não chegou. Tente de novo para recuperar o resultado.
            <BaseButton
              label="Tentar novamente"
              size="sm"
              :full-width="false"
              class="mt-0!"
              @click="retry"
            />
          </div>
          <p v-if="ai.active?.expired" role="alert" class="text-13 text-danger">
            O contexto desta conversa expirou. Use “Nova conversa” para continuar.
          </p>
        </div>
      </div>

      <footer class="border-t border-border p-3 sm:p-4">
        <div
          v-if="files.length"
          class="mb-2 flex flex-col gap-1.5 rounded-card border border-border p-2.5 text-12"
        >
          <p class="text-fg-muted">Os arquivos viram um relatório PDF com a análise.</p>
          <div
            v-for="(file, index) in files"
            :key="`${file.name}-${index}`"
            class="flex items-center gap-2"
          >
            <span class="min-w-0 flex-1 truncate"
              >{{ file.name }} · {{ formatSize(file.size) }}</span
            >
            <button
              type="button"
              :disabled="ai.isBusy"
              class="cursor-pointer text-fg-muted hover:text-fg"
              @click="files.splice(index, 1)"
            >
              Remover
            </button>
          </div>
          <BaseButton
            label="Gerar relatório PDF"
            size="sm"
            :full-width="false"
            :loading="ai.isAnalyzing"
            :disabled="ai.isBusy"
            class="mt-0!"
            @click="analyze"
          />
        </div>
        <input
          ref="file-input"
          type="file"
          class="sr-only"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          :disabled="ai.isBusy"
          aria-label="Selecionar imagens ou PDFs para análise"
          @change="selectFiles"
        />
        <fieldset class="min-w-0" :disabled="composerDisabled">
          <ChatComposer
            v-model="draft"
            accent="ai"
            placeholder="Digite sua mensagem… (Enter envia, Shift+Enter quebra a linha)"
            submit-label="Enviar"
            submit-icon="send"
            @submit="send"
          >
            <template #tools>
              <ChatToolButton
                icon="attach_file"
                label="Analisar imagens ou PDFs"
                @click="fileInput?.click()"
              />
            </template>
          </ChatComposer>
        </fieldset>
      </footer>
    </section>

    <!-- painel lateral --------------------------------------------------------->
    <aside class="hidden w-[290px] shrink-0 flex-col gap-4 overflow-y-auto lg:flex">
      <section class="rounded-card border border-border bg-surface-1 p-4">
        <h3 class="mb-2 text-13 font-semibold text-fg-muted">Contexto</h3>
        <p class="flex items-center gap-2 text-14 font-medium">
          <FolderKanban :size="16" class="text-accent" aria-hidden="true" />
          {{ sectorName ? sectorName : 'Todos os projetos' }}
        </p>
        <p class="mt-1 text-12 text-fg-muted">
          {{
            sectorName
              ? 'A IA responde sobre este projeto e cria tarefas nele.'
              : 'A IA vê todos os projetos que você acessa.'
          }}
        </p>
      </section>

      <section class="rounded-card border border-border bg-surface-1 p-2">
        <h3 class="px-2 pt-2 pb-1 text-13 font-semibold text-fg-muted">Ferramentas</h3>
        <ul>
          <li v-for="tool in tools" :key="tool.label">
            <button
              type="button"
              :disabled="composerDisabled"
              class="flex w-full cursor-pointer items-center gap-2.5 rounded-control px-2 py-2 text-left text-13 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
              @click="useTool(tool)"
            >
              <component :is="tool.icon" :size="16" class="text-fg-muted" aria-hidden="true" />
              {{ tool.label }}
            </button>
          </li>
        </ul>
      </section>

      <section class="flex min-h-0 flex-col rounded-card border border-border bg-surface-1 p-2">
        <h3
          class="flex items-center justify-between px-2 pt-2 pb-1 text-13 font-semibold text-fg-muted"
        >
          Histórico recente <History :size="14" aria-hidden="true" />
        </h3>
        <p v-if="!ai.scoped.length" class="px-2 py-2 text-12 text-fg-muted">
          Suas conversas ficam salvas aqui.
        </p>
        <nav aria-label="Conversas anteriores" class="flex flex-col gap-0.5">
          <div
            v-for="item in ai.scoped"
            :key="item.id"
            :class="[
              'group flex items-start rounded-control transition-colors',
              item.id === ai.activeId
                ? 'border border-accent/60 bg-accent/[0.08]'
                : 'border border-transparent hover:bg-surface-2',
            ]"
          >
            <button
              type="button"
              :disabled="ai.isBusy"
              :aria-current="item.id === ai.activeId ? 'true' : undefined"
              class="flex min-w-0 flex-1 cursor-pointer items-start gap-2 px-2 py-2 text-left text-13 disabled:cursor-wait"
              @click="openHistory(item.id)"
            >
              <MessageSquare :size="14" class="mt-0.5 shrink-0 text-fg-muted" aria-hidden="true" />
              <span class="min-w-0 flex-1">
                <span class="block truncate">{{ item.title }}</span>
                <span class="text-11 text-fg-muted">
                  {{ day(item.messages.at(-1)?.created_at ?? item.updated_at) }}
                </span>
              </span>
            </button>
            <button
              type="button"
              :disabled="ai.isBusy"
              :aria-label="`Apagar a conversa ${item.title}`"
              class="m-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-control text-fg-muted opacity-0 transition hover:bg-surface-3 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
              @click="removeHistory(item.id, item.title)"
            >
              <Trash2 :size="13" aria-hidden="true" />
            </button>
          </div>
        </nav>
        <button
          type="button"
          :disabled="ai.isBusy"
          class="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-control border border-accent/60 px-3 py-2 text-13 font-medium text-fg transition-colors hover:bg-accent hover:text-accent-fg disabled:opacity-50"
          @click="newConversation"
        >
          <Plus :size="15" aria-hidden="true" /> Nova conversa
        </button>
      </section>

      <p class="flex items-start gap-1.5 px-1 text-11 text-fg-muted">
        <Sparkles :size="12" class="mt-0.5 shrink-0" aria-hidden="true" />
        Alterações feitas pela IA ficam salvas; exclusões pedem sua confirmação.
      </p>
    </aside>
  </div>
</template>

<style scoped>
.ai-typing {
  display: inline-flex;
  gap: 4px;
}
.ai-typing i {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-accent);
  animation: ai-dot 1s ease-in-out infinite;
}
.ai-typing i:nth-child(2) {
  animation-delay: 0.15s;
}
.ai-typing i:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes ai-dot {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ai-typing i {
    animation: none;
    opacity: 0.6;
  }
}
</style>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { ArrowLeft, Check, Eye, FileText, Pencil, Pin, PinOff, Plus, Trash2 } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiButton, UiEmptyState, UiIconButton, UiSpinner } from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { createPage, deletePage, getPage, listPages, updatePage } from '../services'
import type { PageSummary, ProjectPage } from '../types'
import { renderMarkdown } from '../utils/markdown'

/** Páginas do projeto (wiki): notas, decisões e especificações em Markdown, salvas sozinhas. */
const props = defineProps<{ sectorId: string; canEdit: boolean }>()
const confirm = useConfirm()

const pages = ref<PageSummary[]>([])
const loading = ref(true)
const current = ref<ProjectPage | null>(null)
const opening = ref(false)
const mode = ref<'read' | 'edit'>('read')
const state = ref<'idle' | 'saving' | 'saved'>('idle')
const title = ref('')
const content = ref('')

watch(
  () => props.sectorId,
  async (id) => {
    loading.value = true
    current.value = null
    try {
      const rows = await listPages(id)
      if (id === props.sectorId) pages.value = rows
    } catch (cause) {
      toast.error(getErrorMessage(cause, 'Não foi possível carregar as páginas.'))
    } finally {
      if (id === props.sectorId) loading.value = false
    }
  },
  { immediate: true },
)

async function open(id: string) {
  if (current.value?.id === id) return
  await flush()
  opening.value = true
  try {
    const page = await getPage(id)
    current.value = page
    title.value = page.title
    content.value = page.content
    mode.value = page.content || !props.canEdit ? 'read' : 'edit'
    state.value = 'idle'
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível abrir a página.'))
  } finally {
    opening.value = false
  }
}

async function create() {
  try {
    const page = await createPage(props.sectorId, { title: 'Página sem título' })
    pages.value = [toSummary(page), ...pages.value]
    current.value = page
    title.value = page.title
    content.value = ''
    mode.value = 'edit'
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível criar a página.'))
  }
}

// prévia na lista sem os sinais do Markdown
const plainText = (text: string) =>
  text
    .replace(/[#*_>`[\]]/g, '')
    .split(/\s+/)
    .join(' ')
    .trim()
const toSummary = (page: ProjectPage): PageSummary => ({
  id: page.id,
  title: page.title,
  is_pinned: page.is_pinned,
  excerpt: plainText(page.content).slice(0, 160),
  updated_by_name: page.updated_by_name,
  updated_at: page.updated_at,
})
const sorted = computed(() =>
  [...pages.value].sort(
    (a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.updated_at.localeCompare(a.updated_at),
  ),
)

// salva sozinho um instante depois de parar de digitar
const dirty = computed(
  () =>
    !!current.value &&
    (title.value.trim() !== current.value.title || content.value !== current.value.content),
)
async function persist() {
  const page = current.value
  if (!page || !dirty.value || !props.canEdit) return
  const payload = { title: title.value.trim().slice(0, 200) || page.title, content: content.value }
  state.value = 'saving'
  try {
    const saved = await updatePage(page.id, payload)
    if (current.value?.id === saved.id) current.value = { ...saved, content: current.value.content }
    pages.value = pages.value.map((row) => (row.id === saved.id ? toSummary(saved) : row))
    state.value = 'saved'
  } catch (cause) {
    state.value = 'idle'
    toast.error(getErrorMessage(cause, 'Não foi possível salvar a página.'))
  }
}
const debounced = useDebounceFn(persist, 900)
watch([title, content], () => {
  if (dirty.value) {
    state.value = 'idle'
    void debounced()
  }
})
const flush = () => persist()

async function togglePin() {
  const page = current.value
  if (!page) return
  try {
    const saved = await updatePage(page.id, { is_pinned: !page.is_pinned })
    current.value = { ...page, is_pinned: saved.is_pinned }
    pages.value = pages.value.map((row) =>
      row.id === saved.id ? { ...row, is_pinned: saved.is_pinned } : row,
    )
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível fixar a página.'))
  }
}

async function remove() {
  const page = current.value
  if (!page) return
  const ok = await confirm({
    title: `Excluir “${page.title}”?`,
    description: 'A página some para todo o projeto. Não dá para desfazer.',
    confirmLabel: 'Excluir página',
    danger: true,
  })
  if (!ok) return
  try {
    await deletePage(page.id)
    pages.value = pages.value.filter((row) => row.id !== page.id)
    current.value = null
    toast.success('Página excluída.')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível excluir a página.'))
  }
}

const html = computed(() => renderMarkdown(content.value))
const when = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void flush()
  }
}
</script>

<template>
  <section class="pg-shell" aria-label="Páginas do projeto">
    <aside :class="['pg-list', current ? 'max-md:hidden' : '']" aria-label="Lista de páginas">
      <div class="flex items-center justify-between gap-2 px-1 pb-2">
        <h2 class="text-13 font-semibold text-fg">
          Páginas <span class="font-mono font-normal text-fg-muted">{{ pages.length }}</span>
        </h2>
        <UiButton v-if="canEdit" size="sm" variant="ghost" :icon="Plus" @click="create">
          Nova
        </UiButton>
      </div>
      <p v-if="loading" class="flex items-center gap-2 px-1 text-13 text-fg-muted">
        <UiSpinner :size="14" /> Carregando…
      </p>
      <ul v-else class="grid gap-1">
        <li v-for="page in sorted" :key="page.id">
          <button
            type="button"
            class="pg-item"
            :aria-current="current?.id === page.id ? 'page' : undefined"
            @click="open(page.id)"
          >
            <span class="flex items-center gap-1.5 text-13 font-medium text-fg">
              <Pin
                v-if="page.is_pinned"
                :size="12"
                class="shrink-0 text-accent"
                aria-label="Fixada"
              />
              <span class="truncate">{{ page.title }}</span>
            </span>
            <span v-if="page.excerpt" class="line-clamp-1 text-12 text-fg-muted">{{
              page.excerpt
            }}</span>
            <span class="text-12 text-fg-muted">
              {{ when(page.updated_at) }}
              <template v-if="page.updated_by_name"> · {{ page.updated_by_name }}</template>
            </span>
          </button>
        </li>
      </ul>
    </aside>

    <div class="pg-main">
      <p v-if="opening" class="flex items-center gap-2 text-13 text-fg-muted">
        <UiSpinner :size="14" /> Abrindo…
      </p>
      <article v-else-if="current" class="grid gap-4" @keydown="onKeydown">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-1 text-12 text-fg-muted hover:text-fg md:hidden"
            @click="flush().then(() => (current = null))"
          >
            <ArrowLeft :size="14" aria-hidden="true" /> Páginas
          </button>
          <p class="flex h-5 items-center gap-1 text-12 text-fg-muted" aria-live="polite">
            <template v-if="state === 'saving'"><UiSpinner :size="12" /> Salvando…</template>
            <template v-else-if="state === 'saved'"
              ><Check :size="12" aria-hidden="true" /> Salvo</template
            >
            <template v-else>
              Editada {{ when(current.updated_at) }}
              <template v-if="current.updated_by_name"> por {{ current.updated_by_name }}</template>
            </template>
          </p>
          <div v-if="canEdit" class="flex items-center gap-1">
            <div class="tl-zoom pg-mode" role="radiogroup" aria-label="Modo da página">
              <button
                type="button"
                role="radio"
                :aria-checked="mode === 'read'"
                @click="mode = 'read'"
              >
                <Eye :size="14" aria-hidden="true" /> Ler
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="mode === 'edit'"
                @click="mode = 'edit'"
              >
                <Pencil :size="14" aria-hidden="true" /> Editar
              </button>
            </div>
            <UiIconButton
              :icon="current.is_pinned ? PinOff : Pin"
              size="sm"
              :label="current.is_pinned ? 'Desafixar página' : 'Fixar no topo'"
              @click="togglePin"
            />
            <UiIconButton :icon="Trash2" size="sm" label="Excluir página" @click="remove" />
          </div>
        </div>

        <label for="page-title" class="sr-only">Título da página</label>
        <input
          id="page-title"
          v-model="title"
          maxlength="200"
          :readonly="!canEdit"
          class="-mx-2 rounded-control border border-transparent bg-transparent px-2 py-1 text-24 leading-tight font-semibold tracking-[-0.015em] text-fg hover:border-border focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/40 read-only:hover:border-transparent"
          @blur="flush"
        />

        <template v-if="mode === 'edit' && canEdit">
          <label for="page-content" class="sr-only">Conteúdo em Markdown</label>
          <textarea
            id="page-content"
            v-model="content"
            class="pg-editor"
            spellcheck="true"
            placeholder="Escreva aqui. # Título, - lista, - [ ] tarefa, **negrito**, `código`, [link](https://…)"
            @blur="flush"
          />
          <p class="text-12 text-fg-muted">
            Markdown: # título · - lista · - [ ] caixa · **negrito** · _itálico_ · `código` ·
            [texto](https://link) · Ctrl+S salva na hora.
          </p>
        </template>
        <!-- eslint-disable-next-line vue/no-v-html -- renderMarkdown escapa todo o texto antes -->
        <div v-else-if="content.trim()" class="md-body" v-html="html" />
        <p v-else class="text-14 text-fg-muted">Página em branco.</p>
      </article>

      <UiEmptyState
        v-else-if="!loading"
        :icon="FileText"
        :title="pages.length ? 'Escolha uma página' : 'Nenhuma página ainda'"
        :description="
          pages.length
            ? 'Abra uma página na lista ao lado.'
            : 'Guarde decisões, combinados, especificações e atas do projeto num lugar só.'
        "
      >
        <template v-if="canEdit && !pages.length" #action>
          <UiButton variant="primary" :icon="Plus" @click="create"
            >Criar a primeira página</UiButton
          >
        </template>
      </UiEmptyState>
    </div>
  </section>
</template>

<style>
.pg-shell {
  display: grid;
  gap: 16px;
  min-height: 100%;
}

@media (width >= 48rem) {
  .pg-shell {
    grid-template-columns: 260px minmax(0, 1fr);
  }
}

.pg-list {
  align-self: start;
  border: 1px solid var(--ds-border);
  border-radius: var(--radius-card);
  background: var(--ds-surface-1);
  padding: 10px;
}

.pg-item {
  display: grid;
  width: 100%;
  cursor: pointer;
  gap: 2px;
  border-radius: 8px;
  padding: 8px 10px;
  text-align: left;
}

.pg-item:hover,
.pg-item[aria-current='page'] {
  background: var(--ds-surface-2);
}

.pg-item:focus-visible {
  outline: 2px solid var(--ds-accent);
  outline-offset: -2px;
}

.pg-main {
  min-width: 0;
  border: 1px solid var(--ds-border);
  border-radius: var(--radius-card);
  background: var(--ds-surface-1);
  padding: 20px 24px 28px;
}

.pg-editor {
  min-height: 420px;
  width: 100%;
  resize: vertical;
  border: 1px solid var(--ds-border);
  border-radius: 10px;
  background: var(--ds-bg-2);
  padding: 14px 16px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: var(--text-13);
  line-height: 1.6;
  color: var(--ds-fg);
}

.pg-editor:focus-visible {
  border-color: var(--ds-accent);
  outline: 2px solid color-mix(in srgb, var(--ds-accent) 40%, transparent);
}

.md-body {
  max-width: 72ch;
  font-size: var(--text-14);
  line-height: 1.7;
  color: var(--ds-fg);
}

.pg-mode button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.md-body > :first-child {
  margin-top: 0;
}

.md-body > * + * {
  margin-top: 0.8em;
}

.md-body h2 {
  margin-top: 1.4em;
  font-size: var(--text-20);
  font-weight: 600;
}

.md-body h3 {
  margin-top: 1.2em;
  font-size: var(--text-16);
  font-weight: 600;
}

.md-body h4 {
  font-size: var(--text-14);
  font-weight: 600;
}

.md-body ul {
  padding-left: 1.3em;
  list-style: disc;
}

.md-body ol {
  padding-left: 1.3em;
  list-style: decimal;
}

.md-body li + li {
  margin-top: 0.25em;
}

.md-body li::marker {
  color: var(--ds-fg-muted);
}

.md-body .md-task {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-left: -1.3em;
  list-style: none;
}

.md-body .md-box {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  translate: 0 2px;
  border: 1.5px solid var(--ds-border-strong);
  border-radius: 4px;
}

.md-body .md-task[data-done='true'] {
  color: var(--ds-fg-muted);
  text-decoration: line-through;
}

.md-body .md-task[data-done='true'] .md-box {
  border-color: var(--ds-success);
  background: var(--ds-success);
}

.md-body a {
  color: var(--ds-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.md-body code {
  border-radius: 4px;
  background: var(--ds-surface-2);
  padding: 1px 5px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.9em;
}

.md-body pre {
  overflow-x: auto;
  border: 1px solid var(--ds-border);
  border-radius: 10px;
  background: var(--ds-bg-2);
  padding: 12px 14px;
}

.md-body pre code {
  background: none;
  padding: 0;
}

.md-body blockquote {
  border-left: 3px solid var(--ds-accent);
  padding-left: 12px;
  color: var(--ds-fg-muted);
}

.md-body hr {
  border: 0;
  border-top: 1px solid var(--ds-border);
}
</style>

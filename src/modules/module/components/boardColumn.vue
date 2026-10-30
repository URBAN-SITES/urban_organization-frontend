<script setup lang="ts">
import { CircleCheck, CircleDashed, CircleDot, MoreHorizontal, Plus, Settings2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { UiIconButton, UiMenu, type MenuItem } from '@/shared/components'
import type { Status, Task } from '../types'
import BoardCard from './boardCard.vue'

const props = defineProps<{
  status: Status
  tasks: Task[]
  canEdit: boolean
  canManage?: boolean
  /** itens "Mover para…" de cada cartão (alternativa de teclado ao arrastar) */
  moveItems: (task: Task) => MenuItem[]
}>()
const emit = defineEmits<{
  add: []
  open: [taskId: string]
  drop: [taskId: string, position: number]
  configure: []
}>()

const ICONS = { todo: CircleDashed, in_progress: CircleDot, done: CircleCheck } as const
const TONE = { todo: '#a1a1aa', in_progress: '#f99f11', done: '#4cc38a' } as const
const over = ref(false)
// posição onde o cartão arrastado vai entrar (mostra a linha de encaixe)
const overIndex = ref<number | null>(null)
const dragging = ref('')
const full = computed(
  () => !!props.status.wip_limit && props.tasks.length >= props.status.wip_limit,
)
const tone = computed(() => props.status.color || TONE[props.status.category])

const columnMenu = computed<MenuItem[]>(() => [
  ...(props.canEdit
    ? [{ label: 'Nova tarefa aqui', icon: Plus, onSelect: () => emit('add') }]
    : []),
  ...(props.canManage
    ? [
        {
          label: 'Configurar colunas',
          icon: Settings2,
          separatorBefore: props.canEdit,
          onSelect: () => emit('configure'),
        },
      ]
    : []),
])

/** Imagem de arraste própria: o cartão "levanta", inclinado e com sombra, em vez do recorte do navegador. */
function dragImage(event: DragEvent) {
  const card = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('article')
  if (!card || !event.dataTransfer) return
  const rect = card.getBoundingClientRect()
  const ghost = card.cloneNode(true) as HTMLElement
  ghost.classList.add('board-ghost')
  ghost.style.width = `${rect.width}px`
  document.body.append(ghost)
  event.dataTransfer.setDragImage(ghost, event.clientX - rect.left, event.clientY - rect.top)
  requestAnimationFrame(() => ghost.remove())
}

function dragStart(event: DragEvent, task: Task) {
  event.dataTransfer?.setData('text/plain', task.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  dragImage(event)
  dragging.value = task.id
}

function dragOver(index: number | null) {
  if (!props.canEdit) return
  over.value = true
  overIndex.value = index
}

function leave() {
  over.value = false
  overIndex.value = null
}

function drop(event: DragEvent, position = props.tasks.length) {
  leave()
  const id = event.dataTransfer?.getData('text/plain')
  if (id && props.canEdit) emit('drop', id, position)
}
</script>

<template>
  <section
    :aria-label="`${status.name}, ${tasks.length} ${tasks.length === 1 ? 'tarefa' : 'tarefas'}`"
    :class="['board-column', { 'is-over': over }]"
    :style="{ '--status': tone }"
    @dragover.prevent="dragOver(tasks.length)"
    @dragleave.self="leave"
    @drop.prevent="drop($event)"
  >
    <header class="flex h-12 shrink-0 items-center gap-2 pr-2 pl-3.5">
      <component
        :is="ICONS[status.category]"
        :size="16"
        class="shrink-0"
        :style="{ color: tone }"
        aria-hidden="true"
      />
      <h3 class="truncate text-13 font-semibold text-fg">{{ status.name }}</h3>
      <span
        :class="['board-count', { 'is-full': full }]"
        :title="status.wip_limit ? 'Tarefas / limite da coluna' : undefined"
      >
        {{ tasks.length }}<template v-if="status.wip_limit">/{{ status.wip_limit }}</template>
      </span>
      <span class="ml-auto flex items-center">
        <UiIconButton
          v-if="canEdit"
          :icon="Plus"
          size="sm"
          :label="`Nova tarefa em ${status.name}`"
          @click="emit('add')"
        />
        <UiMenu
          v-if="columnMenu.length"
          :items="columnMenu"
          :label="`Opções de ${status.name}`"
          placement="bottom-end"
        >
          <template #trigger="{ props: trigger }">
            <UiIconButton
              v-bind="trigger"
              :icon="MoreHorizontal"
              size="sm"
              :label="`Opções de ${status.name}`"
            />
          </template>
        </UiMenu>
      </span>
    </header>

    <TransitionGroup
      tag="ul"
      name="ui-list"
      class="relative flex min-h-20 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2"
    >
      <li
        v-for="(task, index) in tasks"
        :key="task.id"
        :class="[
          'board-slot',
          {
            'is-dragging': dragging === task.id,
            'is-target': over && overIndex === index && dragging !== task.id,
          },
        ]"
        @dragstart="dragStart($event, task)"
        @dragend="dragging = ''"
        @dragover.prevent.stop="dragOver(index)"
        @drop.prevent.stop="drop($event, index)"
      >
        <BoardCard
          :task="task"
          :draggable="canEdit"
          :move-items="moveItems(task)"
          @open="emit('open', task.id)"
        />
      </li>
      <li
        v-if="!tasks.length"
        key="empty"
        class="board-empty grid place-items-center gap-1 px-3 py-8 text-center text-12 text-fg-muted"
      >
        <component :is="ICONS[status.category]" :size="18" aria-hidden="true" />
        {{ canEdit ? 'Arraste uma tarefa para cá ou crie uma nova.' : 'Nenhuma tarefa.' }}
      </li>
    </TransitionGroup>
  </section>
</template>

<style>
.board-column {
  position: relative;
  display: flex;
  width: 18rem;
  flex-shrink: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--ds-border);
  border-radius: var(--radius-card);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--status) 7%, transparent), transparent 120px),
    var(--ds-bg-2);
  transition:
    border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}

@media (width >= 40rem) {
  .board-column {
    width: 19.5rem;
  }
}

/* traço com a cor do estado no topo da coluna */
.board-column::before {
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  content: '';
  background: linear-gradient(90deg, var(--status), transparent 85%);
  opacity: 0.8;
}

.board-column.is-over {
  border-color: rgb(249 159 17 / 0.45);
  box-shadow:
    0 0 0 3px rgb(249 159 17 / 0.12),
    0 18px 40px -24px rgb(249 159 17 / 0.45);
}

.board-count {
  display: inline-grid;
  min-width: 22px;
  height: 20px;
  place-items: center;
  border-radius: 999px;
  background: var(--ds-surface-2);
  padding-inline: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-12);
  color: var(--ds-fg-muted);
}

.board-count.is-full {
  background: var(--ds-danger-soft);
  color: var(--ds-danger);
}

.board-slot {
  position: relative;
  transition: opacity var(--dur-fast) var(--ease-out);
}

/* o lugar de onde o cartão saiu fica marcado enquanto ele está no ar */
.board-slot.is-dragging > article {
  border-style: dashed;
  border-color: var(--ds-border-strong);
  opacity: 0.35;
  box-shadow: none;
}

/* linha de encaixe acima do cartão de destino */
.board-slot.is-target::before {
  position: absolute;
  top: -5px;
  right: 6px;
  left: 6px;
  height: 2px;
  border-radius: 2px;
  content: '';
  background: var(--ds-accent);
  box-shadow: 0 0 10px var(--ds-accent);
}

.board-empty {
  border: 1px dashed var(--ds-border-strong);
  border-radius: 10px;
}

.board-ghost {
  position: fixed;
  top: -1000px;
  left: -1000px;
  transform: rotate(2.5deg);
  border-color: rgb(249 159 17 / 0.5) !important;
  box-shadow:
    0 24px 48px -12px rgb(0 0 0 / 0.7),
    0 0 0 1px rgb(249 159 17 / 0.3) !important;
  pointer-events: none;
}
</style>

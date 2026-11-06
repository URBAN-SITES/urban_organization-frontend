<script setup lang="ts">
import {
  ArrowRight,
  Bell,
  Copy,
  Filter,
  Inbox,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  UiAvatar,
  UiBadge,
  UiButton,
  UiCheckbox,
  UiDialog,
  UiDrawer,
  UiEmptyState,
  UiErrorState,
  UiIconButton,
  UiInput,
  UiMenu,
  UiPopover,
  UiProgress,
  UiSelect,
  UiSkeleton,
  UiSpinner,
  UiSwitch,
  UiTabs,
  UiTextarea,
  UiTooltip,
  type MenuItem,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { staggerDelay } from '@/shared/motion'

/** Uma cópia da galeria; DesignView mostra uma no tema claro e outra no escuro. */

const text = ref('')
const email = ref('ana@empresa')
const notes = ref('')
const status = ref('todo')
const checked = ref(true)
const unchecked = ref(false)
const notify = ref(true)
const tab = ref('hoje')
const dialogOpen = ref(false)
const drawerOpen = ref(false)
const expanded = ref(false)
const confirm = useConfirm()

// lista para demonstrar entrada, saída e reordenação
let nextId = 4
const items = ref([
  { id: 1, title: 'Revisar requisitos do MVP' },
  { id: 2, title: 'Criar wireframes das telas' },
  { id: 3, title: 'Planejar integrações externas' },
])
function addItem() {
  items.value.unshift({ id: nextId, title: `Nova tarefa ${nextId}` })
  nextId += 1
}
function removeItem(id: number) {
  items.value = items.value.filter((item) => item.id !== id)
}
function shuffle() {
  items.value = [...items.value].reverse()
}

const statusOptions = [
  { value: 'todo', label: 'A fazer' },
  { value: 'doing', label: 'Em andamento' },
  { value: 'done', label: 'Concluída' },
]
const tabs = [
  { value: 'hoje', label: 'Hoje', count: 7 },
  { value: 'andamento', label: 'Em andamento', count: 4 },
  { value: 'concluidas', label: 'Concluídas', count: 12 },
  { value: 'arquivadas', label: 'Arquivadas', disabled: true },
]
const menu: MenuItem[] = [
  { label: 'Editar', icon: Pencil, shortcut: 'E', onSelect: () => toast('Editar (demonstração)') },
  { label: 'Duplicar', icon: Copy, onSelect: () => toast('Duplicar (demonstração)') },
  { label: 'Favoritar', icon: Star, disabled: true, onSelect: () => undefined },
  {
    label: 'Excluir',
    icon: Trash2,
    danger: true,
    separatorBefore: true,
    onSelect: () => void askDelete(),
  },
]

async function askDelete() {
  const ok = await confirm({
    title: 'Excluir “Revisar requisitos do MVP”?',
    description:
      'A tarefa, o checklist e os comentários serão removidos. Isso não pode ser desfeito.',
    confirmLabel: 'Excluir tarefa',
    danger: true,
  })
  toast(ok ? 'Confirmado (demonstração: nada foi excluído)' : 'Cancelado')
}

function toastQueue() {
  for (let i = 1; i <= 5; i += 1) toast(`Toast ${i} de 5 (demonstração)`)
}

const section = 'grid gap-3 border-t border-border py-6'
const heading = 'text-12 font-medium tracking-wide text-fg-muted uppercase'
const row = 'flex flex-wrap items-center gap-3'
</script>

<template>
  <div class="min-w-0 rounded-card border border-border bg-bg p-6 text-fg">
    <section :class="section">
      <h2 :class="heading">Tipografia</h2>
      <p class="text-48 font-semibold">48 Display</p>
      <p class="text-32 font-semibold">32 Título de página</p>
      <p class="text-24 font-semibold">24 Seção</p>
      <p class="text-20 font-medium">20 Subtítulo</p>
      <p class="text-16">16 Texto de leitura</p>
      <p class="text-14">14 Texto da interface</p>
      <p class="text-13 text-fg-muted">13 Texto denso e secundário</p>
      <p class="text-12 text-fg-muted">12 Legenda</p>
      <p class="font-mono text-13">INC-142 · git checkout feat/login · Ctrl K</p>
    </section>

    <section :class="section">
      <h2 :class="heading">Cores</h2>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div
          v-for="token in [
            'bg',
            'surface-1',
            'surface-2',
            'surface-3',
            'border',
            'fg',
            'fg-muted',
            'accent',
            'success',
            'warning',
            'danger',
          ]"
          :key="token"
          class="flex items-center gap-2 text-12"
        >
          <span
            class="size-6 shrink-0 rounded-control border border-border"
            :style="{ backgroundColor: `var(--ds-${token})` }"
          />
          <span class="font-mono text-fg-muted">{{ token }}</span>
        </div>
      </div>
    </section>

    <section :class="section">
      <h2 :class="heading">Button</h2>
      <div :class="row">
        <UiButton variant="primary" :icon="Plus">Nova tarefa</UiButton>
        <UiButton>Secundário</UiButton>
        <UiButton variant="ghost">Ghost</UiButton>
        <UiButton variant="danger" :icon="Trash2">Excluir</UiButton>
      </div>
      <div :class="row">
        <UiButton size="sm">Pequeno</UiButton>
        <UiButton size="md">Médio</UiButton>
        <UiButton size="lg" :icon-right="ArrowRight">Grande</UiButton>
      </div>
      <div :class="row">
        <UiButton variant="primary" loading>Salvando</UiButton>
        <UiButton loading>Carregando</UiButton>
        <UiButton disabled>Desabilitado</UiButton>
        <UiButton variant="primary" disabled>Primário desabilitado</UiButton>
      </div>
      <h3 class="mt-2 text-13 font-medium">IconButton</h3>
      <div :class="row">
        <UiIconButton :icon="Filter" label="Filtrar" />
        <UiIconButton :icon="Bell" label="Notificações" variant="secondary" />
        <UiIconButton :icon="Star" label="Favorito" pressed />
        <UiIconButton :icon="Search" label="Buscando" loading />
        <UiIconButton :icon="Mail" label="Desabilitado" disabled />
        <UiIconButton :icon="Plus" label="Pequeno" size="sm" />
        <UiIconButton :icon="Plus" label="Grande" size="lg" />
      </div>
    </section>

    <section :class="section">
      <h2 :class="heading">Campos</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiInput v-model="text" label="Título" placeholder="Ex.: Revisar PR do login" required />
        <UiInput v-model="text" label="Buscar" :icon="Search" placeholder="Buscar tarefas" />
        <UiInput
          v-model="email"
          label="E-mail"
          type="email"
          error="Digite um e-mail válido, como nome@empresa.com"
        />
        <UiInput label="Desabilitado" model-value="Somente leitura" disabled />
        <UiSelect
          v-model="status"
          label="Status"
          :options="statusOptions"
          hint="Coluna do quadro"
        />
        <UiSelect label="Desabilitado" :options="statusOptions" model-value="todo" disabled />
        <UiTextarea
          v-model="notes"
          class="sm:col-span-2"
          label="Descrição"
          hint="Markdown simples é aceito"
        />
      </div>
      <div class="mt-2 grid gap-3 sm:grid-cols-2">
        <UiCheckbox v-model="checked" label="Marcado" description="Com descrição de apoio" />
        <UiCheckbox v-model="unchecked" label="Desmarcado" />
        <UiCheckbox :model-value="false" indeterminate label="Indeterminado" />
        <UiCheckbox :model-value="true" disabled label="Desabilitado" />
        <UiSwitch v-model="notify" label="Notificações por push" description="Ligado" />
        <UiSwitch :model-value="false" label="Desabilitado" disabled />
      </div>
    </section>

    <section :class="section">
      <h2 :class="heading">Badge e Avatar</h2>
      <div :class="row">
        <UiBadge>Neutro</UiBadge>
        <UiBadge tone="accent">Em revisão</UiBadge>
        <UiBadge tone="success">Concluída</UiBadge>
        <UiBadge tone="warning">Vence hoje</UiBadge>
        <UiBadge tone="danger">Atrasada</UiBadge>
        <UiBadge><span class="font-mono">INC-42</span></UiBadge>
      </div>
      <div :class="row">
        <UiAvatar name="Paulo Artur" size="xs" />
        <UiAvatar name="Paulo Artur" size="sm" />
        <UiAvatar name="Maria Souza" size="md" />
        <UiAvatar name="Kennedy" size="lg" />
        <UiAvatar name="Imagem quebrada" src="/nao-existe.png" />
      </div>
    </section>

    <section :class="section">
      <h2 :class="heading">Tabs</h2>
      <UiTabs v-model="tab" :tabs="tabs" label="Minhas tarefas">
        <template #default="{ active }">
          <p class="text-13 text-fg-muted">Painel ativo: {{ active }} (setas, Home e End trocam)</p>
        </template>
      </UiTabs>
    </section>

    <section :class="section">
      <h2 :class="heading">Sobreposições</h2>
      <div :class="row">
        <UiTooltip text="Copia o link da tarefa">
          <UiButton :icon="Copy">Tooltip (hover ou foco)</UiButton>
        </UiTooltip>
        <UiMenu :items="menu" label="Ações da tarefa">
          <template #trigger="{ props: trigger }">
            <UiButton v-bind="trigger" :icon="MoreHorizontal">Menu</UiButton>
          </template>
        </UiMenu>
        <UiPopover label="Filtros">
          <template #trigger="{ props: trigger }">
            <UiButton v-bind="trigger" :icon="Filter">Popover</UiButton>
          </template>
          <template #default="{ close }">
            <div class="grid w-56 gap-3">
              <UiCheckbox :model-value="true" label="Minhas tarefas" />
              <UiCheckbox :model-value="false" label="Sem responsável" />
              <UiButton size="sm" @click="close()">Aplicar</UiButton>
            </div>
          </template>
        </UiPopover>
        <UiButton @click="dialogOpen = true">Dialog</UiButton>
        <UiButton @click="drawerOpen = true">Drawer</UiButton>
        <UiButton variant="danger" @click="askDelete">ConfirmDialog</UiButton>
      </div>
      <div :class="row">
        <UiButton @click="toast.success('Tarefa salva (demonstração)')">Toast sucesso</UiButton>
        <UiButton
          @click="
            toast.error('Não foi possível salvar', { description: 'Sem conexão (demonstração)' })
          "
        >
          Toast erro
        </UiButton>
        <UiButton @click="toastQueue">Fila de 5 toasts</UiButton>
      </div>
    </section>

    <section :class="section">
      <h2 :class="heading">Carregamento</h2>
      <div :class="row">
        <UiSpinner />
        <UiSpinner :size="20" />
        <div class="w-48"><UiProgress :value="62" label="Progresso do setor" /></div>
        <div class="w-48"><UiProgress label="Enviando arquivo" /></div>
      </div>
      <div class="grid gap-2 rounded-card border border-border bg-surface-1 p-4">
        <div class="flex items-center gap-3">
          <UiSkeleton circle class="size-8" />
          <div class="grid flex-1 gap-1.5">
            <UiSkeleton class="h-3.5 w-2/3" />
            <UiSkeleton class="h-3 w-1/3" />
          </div>
        </div>
        <UiSkeleton class="h-20 w-full" />
      </div>
    </section>

    <section :class="section">
      <h2 :class="heading">Estados</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-card border border-border bg-surface-1">
          <UiEmptyState
            :icon="Inbox"
            title="Nenhuma tarefa por aqui"
            description="Crie a primeira tarefa deste setor para começar."
          >
            <template #action>
              <UiButton variant="primary" size="sm" :icon="Plus">Nova tarefa</UiButton>
            </template>
          </UiEmptyState>
        </div>
        <div class="rounded-card border border-border bg-surface-1">
          <UiErrorState description="O servidor não respondeu. Seus dados estão seguros." />
        </div>
      </div>
    </section>

    <section :class="section">
      <h2 :class="heading">Motion: lista e altura</h2>
      <div :class="row">
        <UiButton size="sm" :icon="Plus" @click="addItem">Adicionar</UiButton>
        <UiButton size="sm" @click="shuffle">Inverter ordem</UiButton>
        <UiButton size="sm" @click="expanded = !expanded">
          {{ expanded ? 'Recolher' : 'Expandir' }} detalhes
        </UiButton>
      </div>
      <TransitionGroup tag="ul" name="ui-list" class="relative grid gap-1.5">
        <li
          v-for="(item, index) in items"
          :key="item.id"
          :style="{ transitionDelay: `${staggerDelay(index)}ms` }"
          class="flex h-10 items-center justify-between rounded-control border border-border bg-surface-1 px-3 text-13"
        >
          {{ item.title }}
          <UiIconButton :icon="Trash2" label="Remover" size="sm" @click="removeItem(item.id)" />
        </li>
      </TransitionGroup>
      <div class="ui-collapse" :data-open="expanded">
        <div>
          <p class="rounded-control bg-surface-2 p-3 text-13 text-fg-muted">
            Conteúdo que expande com grid-template-rows (0fr → 1fr), sem animar height.
          </p>
        </div>
      </div>
    </section>

    <UiDialog
      v-model:open="dialogOpen"
      title="Convidar para o setor"
      description="A pessoa recebe um e-mail com o link de acesso."
    >
      <UiInput label="E-mail" type="email" placeholder="nome@empresa.com" />
      <template #footer>
        <UiButton @click="dialogOpen = false">Cancelar</UiButton>
        <UiButton variant="primary" @click="dialogOpen = false">Enviar convite</UiButton>
      </template>
    </UiDialog>
    <UiDrawer v-model:open="drawerOpen" title="Detalhe da tarefa" description="Inceptum Web">
      <p class="text-14 text-fg-muted">Split-view de detalhe. Esc ou clique fora fecha.</p>
    </UiDrawer>
  </div>
</template>

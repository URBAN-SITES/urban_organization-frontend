<script setup lang="ts">
import { Check } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import {
  PROJECT_COLORS,
  PROJECT_ICONS,
  ProjectIcon,
  createSector,
  updateSector,
  type Sector,
} from '@/modules/module'
import {
  GitHubRequestError,
  importGitHubProject,
  listGitHubProjects,
  type GitHubProjectBoard,
} from '@/modules/github'
import { UiButton, UiDialog, UiInput, UiSelect, UiSwitch, UiTextarea } from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'

/** Criar ou editar um projeto (setor). Sem `project`, cria na organização. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ organizationId: string; project?: Sector | null }>()
const emit = defineEmits<{ saved: [project: Sector] }>()
const confirm = useConfirm()

const form = reactive({ name: '', description: '', color: '', icon: '', isPrivate: true })
const errors = reactive({ name: '', form: '' })
const saving = ref(false)

// com o GitHub vinculado, o projeto novo pode nascer de um GitHub Project
const boards = ref<GitHubProjectBoard[]>([])
const board = ref('')
const boardsHint = ref('')
const boardOptions = computed(() => [
  { value: '', label: 'Começar vazio' },
  ...boards.value.map((item) => ({
    value: item.id,
    label: `${item.owner} / ${item.title}${item.closed ? ' (fechado)' : ''}`,
  })),
])

async function loadBoards() {
  boards.value = []
  boardsHint.value = ''
  try {
    boards.value = await listGitHubProjects()
  } catch (cause) {
    // sem GitHub vinculado a opção simplesmente não aparece
    if (cause instanceof GitHubRequestError && cause.code === 'github_forbidden')
      boardsHint.value =
        'O GitHub App ainda não tem permissão para ler Projects. Peça a quem administra o app.'
  }
}

watch(board, (id, previous) => {
  const title = (key: string) => boards.value.find((item) => item.id === key)?.title ?? ''
  if (!form.name.trim() || form.name === title(previous)) form.name = title(id)
})

watch(open, (value) => {
  if (!value) return
  const project = props.project
  Object.assign(form, {
    name: project?.name ?? '',
    description: project?.description ?? '',
    color: project?.color || PROJECT_COLORS[0]!.value,
    icon: PROJECT_ICONS.some((item) => item.key === project?.icon) ? project!.icon : 'folder',
    isPrivate: project?.is_private ?? true,
  })
  Object.assign(errors, { name: '', form: '' })
  board.value = ''
  if (!project) void loadBoards()
})

// o erro some assim que o nome é preenchido
watch(
  () => form.name,
  (value) => {
    if (errors.name && value.trim()) errors.name = ''
  },
)

async function save() {
  if (saving.value) return
  errors.name = form.name.trim() ? '' : 'Dê um nome para o projeto.'
  if (errors.name) return
  const project = props.project
  if (
    project?.is_private &&
    !form.isPrivate &&
    !(await confirm({
      title: 'Abrir o projeto para toda a organização?',
      description: 'Todos os membros da organização poderão ver as tarefas deste projeto.',
      confirmLabel: 'Tornar visível',
    }))
  )
    return
  const payload = {
    name: form.name.trim(),
    description: form.description.trim(),
    color: form.color,
    icon: form.icon,
    is_private: form.isPrivate,
  }
  saving.value = true
  errors.form = ''
  try {
    const saved = project
      ? await updateSector(project.id, payload)
      : await createSector(props.organizationId, payload)
    if (!project && board.value) {
      try {
        const result = await importGitHubProject(saved.id, board.value)
        toast.success(`Quadro "${result.project}" importado`, {
          description: `${result.created} ${result.created === 1 ? 'tarefa' : 'tarefas'}`,
        })
      } catch (cause) {
        // o projeto já existe: avisa e segue, dá para importar depois na aba GitHub
        toast.error('Projeto criado, mas o quadro do GitHub não foi importado.', {
          description: getErrorMessage(cause, 'Tente de novo na aba GitHub do projeto.'),
        })
      }
    }
    emit('saved', saved)
    open.value = false
  } catch (cause) {
    errors.form = getErrorMessage(cause, 'Não foi possível salvar o projeto.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiDialog
    v-model:open="open"
    :title="project ? 'Editar projeto' : 'Novo projeto'"
    :description="project ? undefined : 'Cada projeto tem seu próprio quadro de tarefas.'"
    :dismissible="!saving"
  >
    <form id="project-form" class="flex flex-col gap-5" novalidate @submit.prevent="save">
      <div class="flex items-end gap-3">
        <ProjectIcon :icon="form.icon" :color="form.color" size="lg" class="mb-0.5" />
        <UiInput
          v-model="form.name"
          label="Nome"
          maxlength="255"
          required
          class="flex-1"
          :error="errors.name"
        />
      </div>
      <UiTextarea v-model="form.description" label="Descrição" :rows="3" />
      <UiSelect
        v-if="!project && boards.length"
        v-model="board"
        :options="boardOptions"
        label="Criar a partir de um GitHub Project"
        hint="As colunas e os cartões do quadro viram colunas e tarefas deste projeto."
      />
      <p v-else-if="!project && boardsHint" class="text-13 text-fg-muted">{{ boardsHint }}</p>

      <fieldset>
        <legend class="mb-2 text-13 font-medium text-fg">Cor</legend>
        <div class="flex flex-wrap gap-2">
          <label v-for="color in PROJECT_COLORS" :key="color.value" class="relative">
            <input
              v-model="form.color"
              type="radio"
              name="project-color"
              :value="color.value"
              class="peer sr-only"
            />
            <span
              :title="color.label"
              class="grid size-7 cursor-pointer place-items-center rounded-full text-white ring-offset-2 ring-offset-surface-1 peer-checked:ring-2 peer-checked:ring-fg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-accent"
              :style="{ backgroundColor: color.value }"
            >
              <Check v-if="form.color === color.value" :size="14" :stroke-width="3" />
            </span>
            <span class="sr-only">{{ color.label }}</span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend class="mb-2 text-13 font-medium text-fg">Ícone</legend>
        <div class="grid grid-cols-7 gap-1.5">
          <label v-for="item in PROJECT_ICONS" :key="item.key" :title="item.label">
            <input
              v-model="form.icon"
              type="radio"
              name="project-icon"
              :value="item.key"
              class="peer sr-only"
            />
            <span
              class="grid h-9 cursor-pointer place-items-center rounded-control border border-border text-fg-muted transition-colors duration-(--dur-fast) ease-out peer-checked:border-fg peer-checked:bg-surface-2 peer-checked:text-fg peer-focus-visible:outline-2 peer-focus-visible:outline-accent hover:bg-surface-2"
            >
              <component :is="item.icon" :size="16" aria-hidden="true" />
            </span>
            <span class="sr-only">{{ item.label }}</span>
          </label>
        </div>
      </fieldset>

      <UiSwitch
        :model-value="!form.isPrivate"
        label="Visível para toda a organização"
        description="Desligado, só participantes e times vinculados veem o projeto."
        @update:model-value="form.isPrivate = !$event"
      />

      <p v-if="errors.form" role="alert" class="text-13 text-danger">{{ errors.form }}</p>
    </form>
    <template #footer>
      <UiButton :disabled="saving" @click="open = false">Cancelar</UiButton>
      <UiButton type="submit" form="project-form" variant="primary" :loading="saving">
        {{ project ? 'Salvar' : 'Criar projeto' }}
      </UiButton>
    </template>
  </UiDialog>
</template>

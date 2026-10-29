<script setup lang="ts">
import { History, MessageSquare, Trash2 } from '@lucide/vue'
import { ref, useTemplateRef, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { useAuthStore } from '@/modules/auth'
import {
  UiAvatar,
  UiEmptyState,
  UiErrorState,
  UiIconButton,
  UiSkeleton,
  UiTabs,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { fetchAllPages } from '@/shared/utils'
import { relativeTime } from '@/shared/utils/time'
import { createComment, deleteComment, listComments, listTaskActivity } from '../services'
import type { Comment, Person, TaskActivity } from '../types'
import { commentParts, historyLines } from '../utils/taskText'
import CommentComposer from './commentComposer.vue'

/** Comentários (com @menção) e o histórico de mudanças da tarefa. */
const props = defineProps<{
  taskId: string
  people: Person[]
  canComment: boolean
  canManage: boolean
}>()
const emit = defineEmits<{ changed: [] }>()
const auth = useAuthStore()
const confirm = useConfirm()

const tab = ref<'comments' | 'history'>('comments')
const comments = ref<Comment[]>([])
const history = ref<TaskActivity[]>([])
const loading = ref(false)
const error = ref('')
const sending = ref(false)
const composer = useTemplateRef<InstanceType<typeof CommentComposer>>('composer')
const TABS = [
  { value: 'comments', label: 'Comentários' },
  { value: 'history', label: 'Histórico' },
]

async function load() {
  const id = props.taskId
  const which = tab.value
  loading.value = true
  error.value = ''
  try {
    if (which === 'comments') {
      const rows = await fetchAllPages((page) => listComments(id, page))
      if (id === props.taskId) comments.value = rows
    } else {
      const rows = (await listTaskActivity(id)).results
      if (id === props.taskId) history.value = rows
    }
  } catch (cause) {
    if (id === props.taskId) error.value = getErrorMessage(cause, 'Tente novamente.')
  } finally {
    if (id === props.taskId) loading.value = false
  }
}
watch(
  () => props.taskId,
  () => {
    comments.value = []
    history.value = []
    void load()
  },
  { immediate: true },
)
watch(tab, load)

async function send(content: string, mentions: string[]) {
  sending.value = true
  try {
    comments.value = [...comments.value, await createComment(props.taskId, content, mentions)]
    composer.value?.reset()
    emit('changed')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível comentar.'))
  } finally {
    sending.value = false
  }
}

async function remove(comment: Comment) {
  const ok = await confirm({
    title: 'Apagar este comentário?',
    description: 'Ele some para todos que veem a tarefa.',
    confirmLabel: 'Apagar',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteComment(props.taskId, comment.id)
    comments.value = comments.value.filter((row) => row.id !== comment.id)
    emit('changed')
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível apagar o comentário.'))
  }
}

const canDelete = (comment: Comment) => props.canManage || comment.author_id === auth.user?.id
</script>

<template>
  <section aria-label="Conversa e histórico" class="grid gap-3">
    <UiTabs v-model="tab" :tabs="TABS" label="Conversa da tarefa">
      <div class="mt-3 grid gap-3">
        <div v-if="loading && !(tab === 'comments' ? comments : history).length" class="grid gap-2">
          <UiSkeleton v-for="n in 2" :key="n" class="h-12" />
        </div>
        <UiErrorState
          v-else-if="error"
          title="Não foi possível carregar"
          :description="error"
          @retry="load"
        />

        <template v-else-if="tab === 'comments'">
          <UiEmptyState
            v-if="!comments.length"
            :icon="MessageSquare"
            title="Nenhum comentário ainda"
            :description="canComment ? 'Comece a conversa. Use @ para chamar alguém.' : undefined"
          />
          <ul v-else class="grid gap-4">
            <li v-for="comment in comments" :key="comment.id" class="group flex gap-3">
              <UiAvatar :name="comment.author_name" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="flex items-baseline gap-2 text-13">
                  <span class="font-medium text-fg">{{ comment.author_name }}</span>
                  <time class="text-12 text-fg-muted" :datetime="comment.created_at">
                    {{ relativeTime(comment.created_at) }}
                  </time>
                </p>
                <p class="text-14 break-words whitespace-pre-wrap text-fg">
                  <template
                    v-for="(part, index) in commentParts(comment.content, comment.mentions)"
                    :key="index"
                  >
                    <span
                      v-if="part.mention"
                      class="rounded-[4px] bg-surface-3 px-0.5 font-medium"
                      >{{ part.text }}</span
                    >
                    <template v-else>{{ part.text }}</template>
                  </template>
                </p>
              </div>
              <UiIconButton
                v-if="canDelete(comment)"
                :icon="Trash2"
                size="sm"
                label="Apagar comentário"
                class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
                @click="remove(comment)"
              />
            </li>
          </ul>
          <CommentComposer
            v-if="canComment"
            ref="composer"
            :people="people"
            :sending="sending"
            @submit="send"
          />
        </template>

        <template v-else>
          <UiEmptyState v-if="!history.length" :icon="History" title="Sem histórico" />
          <ol v-else class="grid gap-3 border-l border-border pl-4">
            <li v-for="entry in history" :key="entry.id" class="text-13">
              <p class="text-fg">
                <span class="font-medium">{{ entry.actor_name ?? 'Alguém' }}</span>
                {{ historyLines(entry).join(', ') }}
              </p>
              <time class="text-12 text-fg-muted" :datetime="entry.created_at">
                {{ relativeTime(entry.created_at) }}
              </time>
            </li>
          </ol>
        </template>
      </div>
    </UiTabs>
  </section>
</template>

<script setup lang="ts">
import {
  AtSign,
  Bell,
  BellRing,
  Building2,
  Check,
  CheckCheck,
  CircleDot,
  MessageSquare,
  UserPlus,
  type LucideIcon,
} from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  PageLayout,
  UiAvatar,
  UiButton,
  UiEmptyState,
  UiErrorState,
  UiIconButton,
  UiPanel,
  UiSkeleton,
  UiSwitch,
  UiTabs,
} from '@/shared/components'
import { relativeTime } from '@/shared/utils/time'
import { useNotificationsStore } from '../stores'
import { useOpenNotification } from '../composables/useOpenNotification'
import { showDesktopAlert } from '../composables/desktopAlerts'
import type { AppNotification, NotificationFilterKind } from '../types'
import {
  dayLabel,
  notificationActor,
  notificationKind,
  notificationTitle,
  type NotificationKind,
} from '../utils'

/** Central de notificações: filtros no servidor, agrupada por dia, abre o destino. */
const notifications = useNotificationsStore()
const openNotification = useOpenNotification()
const isChangingPush = ref(false)
const isSending = ref(false)

const TABS = [
  { value: 'all', label: 'Todas' },
  { value: 'mention', label: 'Menções' },
  { value: 'task', label: 'Tarefas' },
  { value: 'organization', label: 'Organização' },
]
const ICONS: Record<NotificationKind, LucideIcon> = {
  mention: AtSign,
  assigned: UserPlus,
  comment: MessageSquare,
  status: CircleDot,
  organization: Building2,
  other: Bell,
}

const tab = computed({
  get: () => notifications.kind ?? 'all',
  set: (value: string) =>
    void notifications.setFilter({
      unread: notifications.unreadOnly,
      kind: value === 'all' ? null : (value as NotificationFilterKind),
    }),
})
const unreadOnly = computed({
  get: () => notifications.unreadOnly,
  set: (value: boolean) =>
    void notifications.setFilter({ unread: value, kind: notifications.kind }),
})

const groups = computed(() => {
  const map = new Map<string, AppNotification[]>()
  for (const item of notifications.items) {
    const label = dayLabel(item.created_at)
    map.set(label, [...(map.get(label) ?? []), item])
  }
  return [...map.entries()]
})
const firstLoad = computed(() => notifications.isLoading && !notifications.items.length)
const failed = computed(() => !!notifications.error && !notifications.items.length)
const alertsOn = computed(() => notifications.pushEnabled || notifications.desktopEnabled)
const emptyText = computed(() => {
  if (notifications.unreadOnly) return 'Você leu tudo deste filtro.'
  if (notifications.kind) return 'Nenhuma notificação deste tipo ainda.'
  return 'Atribuições, comentários, menções e mudanças na organização aparecem aqui.'
})

onMounted(() => {
  void notifications.load()
})

async function togglePush(): Promise<void> {
  isChangingPush.value = true
  try {
    if (alertsOn.value) {
      if (notifications.pushEnabled) await notifications.disablePush()
      notifications.disableDesktop()
    } else {
      // os avisos do computador funcionam em qualquer navegador; o push do Firebase é um extra
      await notifications.enableDesktop()
      await notifications.enablePush()
      toast.success('Avisos ativados neste computador.')
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Não foi possível alterar os avisos.')
  } finally {
    isChangingPush.value = false
  }
}

async function sendTest(): Promise<void> {
  isSending.value = true
  try {
    if (notifications.pushEnabled) await notifications.sendTest()
    else
      showDesktopAlert({
        title: 'Urban Organization',
        body: 'Os avisos deste computador estão funcionando.',
        tag: 'inceptum-test',
      })
    toast.success('Aviso enviado. Confira a notificação do seu sistema.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o teste.')
  } finally {
    isSending.value = false
  }
}

async function markAll(): Promise<void> {
  await notifications.markAllAsRead()
  if (!notifications.error) toast.success('Todas marcadas como lidas.')
}
</script>

<template>
  <PageLayout
    :icon="Bell"
    tone="#f99f11"
    :crumbs="['Notificações']"
    title="Notificações"
    width="narrow"
  >
    <template #description>
      <span aria-live="polite">
        {{
          notifications.unreadCount
            ? `${notifications.unreadCount} não ${notifications.unreadCount === 1 ? 'lida' : 'lidas'}`
            : 'Tudo em dia'
        }}
      </span>
    </template>
    <template #actions>
      <UiButton :icon="CheckCheck" :disabled="!notifications.unreadCount" @click="markAll">
        Marcar todas como lidas
      </UiButton>
    </template>

    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <UiTabs v-model="tab" :tabs="TABS" label="Tipo de notificação" />
      <UiSwitch v-model="unreadOnly" label="Só não lidas" class="pb-2" />
    </div>

    <div v-if="firstLoad" class="grid gap-3" aria-label="Carregando notificações">
      <div v-for="n in 5" :key="n" class="flex items-center gap-3">
        <UiSkeleton circle class="size-8" />
        <div class="grid flex-1 gap-1.5">
          <UiSkeleton class="h-4 w-2/3" />
          <UiSkeleton class="h-3 w-1/3" />
        </div>
      </div>
    </div>

    <UiErrorState
      v-else-if="failed"
      title="Não foi possível carregar as notificações"
      :description="notifications.error"
      :retrying="notifications.isLoading"
      @retry="notifications.load()"
    />

    <UiEmptyState
      v-else-if="!notifications.items.length"
      :icon="Bell"
      :title="notifications.unreadOnly ? 'Nada pendente' : 'Nenhuma notificação'"
      :description="emptyText"
    />

    <div v-else class="grid grid-cols-1 gap-6">
      <p v-if="notifications.error" role="alert" class="text-13 text-danger">
        {{ notifications.error }}
      </p>
      <section
        v-for="[day, items] in groups"
        :key="day"
        :aria-label="day"
        class="grid grid-cols-1 gap-2"
      >
        <h2 class="text-12 font-medium text-fg-muted">{{ day }}</h2>
        <ul class="divide-y divide-border uo-card">
          <li
            v-for="item in items"
            :key="item.id"
            class="relative flex items-center gap-3 px-4 py-3 transition-colors duration-(--dur-fast) ease-out hover:bg-surface-2"
          >
            <UiAvatar
              v-if="notificationActor(item.title)"
              :name="notificationActor(item.title)!"
              size="sm"
            />
            <span
              v-else
              class="grid size-8 shrink-0 place-items-center rounded-control border border-border bg-surface-2 text-fg-muted"
              aria-hidden="true"
            >
              <component :is="ICONS[notificationKind(item)]" :size="16" />
            </span>

            <span class="flex min-w-0 flex-1 flex-col">
              <button
                type="button"
                class="cursor-pointer truncate text-left text-14 text-fg after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-card after:focus-visible:outline-2 after:focus-visible:outline-accent"
                :class="item.is_read ? 'font-normal' : 'font-semibold'"
                @click="openNotification(item)"
              >
                {{ notificationTitle(item.title) }}
                <span v-if="!item.is_read" class="sr-only">(não lida)</span>
              </button>
              <span class="truncate text-12 text-fg-muted">
                {{ item.message }}{{ item.message ? ' · ' : '' }}{{ relativeTime(item.created_at) }}
              </span>
            </span>
            <UiIconButton
              v-if="!item.is_read"
              :icon="Check"
              label="Marcar como lida"
              size="sm"
              class="relative"
              @click="notifications.markAsRead(item.id)"
            />
          </li>
        </ul>
      </section>

      <UiButton
        v-if="notifications.hasMore"
        class="self-center"
        :loading="notifications.isLoading"
        @click="notifications.loadMore()"
      >
        Carregar mais
      </UiButton>
    </div>

    <UiPanel
      title="Avisos neste navegador"
      :description="
        alertsOn
          ? 'Mensagens, atribuições e menções aparecem no seu computador quando você não está na aba.'
          : 'Ative para ver mensagens, atribuições e menções no seu computador quando você não está na aba.'
      "
    >
      <div class="flex flex-wrap gap-2">
        <UiButton
          :icon="BellRing"
          :variant="alertsOn ? 'secondary' : 'primary'"
          :loading="isChangingPush"
          @click="togglePush"
        >
          {{ alertsOn ? 'Desativar avisos' : 'Ativar avisos' }}
        </UiButton>
        <UiButton v-if="alertsOn" variant="ghost" :loading="isSending" @click="sendTest">
          Enviar teste
        </UiButton>
      </div>
    </UiPanel>
  </PageLayout>
</template>

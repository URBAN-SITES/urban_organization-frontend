<script setup lang="ts">
import { ChevronLeft, ChevronRight, MailPlus, Send, Users } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { emailProblem, useAuthStore } from '@/modules/auth'
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
  type Invitation,
  type InviteRole,
} from '@/modules/invitations'
import {
  UiAvatar,
  UiBadge,
  UiButton,
  UiDialog,
  UiEmptyState,
  UiErrorState,
  UiIconButton,
  UiInput,
  UiSelect,
  UiSkeleton,
  UiTabs,
  type TabItem,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import type { Page } from '@/shared/types'
import OrganizationLayout from '../components/organizationLayout.vue'
import MemberActions from '../components/memberActions.vue'
import { getOrganization, listMembers } from '../services'
import { useOrganizationsStore } from '../stores'
import type { Organization, OrganizationMember } from '../types'
import { roleLabels } from '../utils'

type Tab = 'members' | 'invitations'

const route = useRoute()
const auth = useAuthStore()
const store = useOrganizationsStore()
const confirm = useConfirm()
const organization = ref<Organization | null>(null)
const members = ref<Page<OrganizationMember> | null>(null)
const invitations = ref<Page<Invitation> | null>(null)
const tab = ref<Tab>('members')
const page = ref(1)
const loading = ref(true)
const error = ref('')
const inviteOpen = ref(false)
const formError = ref('')
const emailError = ref('')
const saving = ref(false)
const revoking = ref('')
const email = ref('')
const role = ref<InviteRole>('member')
const canInvite = computed(() =>
  ['owner', 'admin'].includes(organization.value?.current_role ?? ''),
)
const id = computed(() => String(route.params.organizationId))
const currentPage = computed(() => (tab.value === 'members' ? members.value : invitations.value))
const tabs = computed<TabItem[]>(() => [
  { value: 'members', label: 'Membros', count: members.value?.count },
  ...(canInvite.value
    ? [{ value: 'invitations', label: 'Convites', count: invitations.value?.count }]
    : []),
])
const roleOptions = computed(() => [
  { value: 'member', label: 'Membro' },
  { value: 'viewer', label: 'Leitor' },
  ...(organization.value?.current_role === 'owner'
    ? [{ value: 'admin', label: 'Administrador' }]
    : []),
])
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' })

function isCurrent(requestedId: string, requestedTab: Tab, requestedPage: number) {
  return requestedId === id.value && requestedTab === tab.value && requestedPage === page.value
}

async function loadRows() {
  const requested = [id.value, tab.value, page.value] as const
  loading.value = true
  error.value = ''
  try {
    if (requested[1] === 'members') {
      const result = await listMembers(requested[0], requested[2])
      if (isCurrent(...requested)) members.value = result
    } else if (canInvite.value) {
      const result = await listInvitations(requested[0], requested[2])
      if (isCurrent(...requested)) invitations.value = result
    }
  } catch (cause) {
    if (isCurrent(...requested))
      error.value = getErrorMessage(cause, 'Confira sua conexão e tente novamente.')
  } finally {
    if (isCurrent(...requested)) loading.value = false
  }
}

async function load() {
  const requestedId = id.value
  inviteOpen.value = false
  organization.value = null
  members.value = null
  invitations.value = null
  tab.value = 'members'
  page.value = 1
  loading.value = true
  error.value = ''
  try {
    const [result] = await Promise.all([getOrganization(requestedId), store.load()])
    if (requestedId !== id.value) return
    organization.value = result
    await loadRows()
    // vindo de "Convidar pessoas": já abre o formulário
    if (route.query.convidar && canInvite.value) openInvite()
  } catch (cause) {
    if (requestedId !== id.value) return
    error.value = getErrorMessage(cause, 'Confira sua conexão e seu acesso a esta organização.')
    loading.value = false
  }
}

function changePage(offset: number) {
  page.value += offset
  void loadRows()
}

function reloadMembers() {
  page.value = 1
  void loadRows()
}

watch(tab, () => {
  page.value = 1
  if (organization.value) void loadRows()
})

function openInvite() {
  email.value = ''
  role.value = 'member'
  formError.value = ''
  emailError.value = ''
  inviteOpen.value = true
}

async function invite() {
  if (saving.value || !canInvite.value) return
  emailError.value = emailProblem(email.value)
  if (emailError.value) return
  const requestedId = id.value
  saving.value = true
  formError.value = ''
  try {
    await createInvitation(requestedId, { email: email.value.trim(), role: role.value })
    toast.success('Convite enviado por e-mail.')
    if (requestedId !== id.value) return
    inviteOpen.value = false
    if (tab.value === 'invitations') void loadRows()
    else tab.value = 'invitations'
  } catch (cause) {
    formError.value = getErrorMessage(cause, 'Não foi possível enviar o convite.')
  } finally {
    saving.value = false
  }
}

async function revoke(invitation: Invitation) {
  if (revoking.value) return
  const confirmed = await confirm({
    title: `Revogar o convite de ${invitation.email}?`,
    description: 'O link enviado deixa de funcionar. Você pode convidar de novo depois.',
    confirmLabel: 'Revogar',
    danger: true,
  })
  if (!confirmed) return
  revoking.value = invitation.id
  const requestedId = id.value
  try {
    await revokeInvitation(requestedId, invitation.id)
    toast.success('Convite revogado.')
    if (requestedId === id.value) await loadRows()
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível revogar o convite.'))
  } finally {
    revoking.value = ''
  }
}

const STATUS = {
  pending: { label: 'Pendente', tone: 'warning' },
  accepted: { label: 'Aceito', tone: 'success' },
  revoked: { label: 'Revogado', tone: 'neutral' },
  expired: { label: 'Expirado', tone: 'neutral' },
} as const

function inviteStatus(invitation: Invitation) {
  if (invitation.status === 'pending' && Date.parse(invitation.expires_at) <= Date.now())
    return STATUS.expired
  return STATUS[invitation.status]
}

watch(id, load, { immediate: true })
</script>

<template>
  <OrganizationLayout
    title="Membros e convites"
    :description="
      organization
        ? `${organization.name} · Seu papel: ${roleLabels[organization.current_role]}`
        : undefined
    "
    :organization-id="organization?.id"
  >
    <template v-if="canInvite" #actions>
      <UiButton variant="primary" :icon="MailPlus" @click="openInvite">Convidar pessoas</UiButton>
    </template>

    <UiErrorState
      v-if="!organization && error"
      title="Não foi possível abrir esta organização"
      :description="error"
      @retry="load"
    />

    <UiTabs v-else v-model="tab" :tabs="tabs" label="Integrantes da organização">
      <section class="mt-4 overflow-hidden rounded-card border border-border bg-surface-1">
        <ul v-if="loading" aria-label="Carregando" class="divide-y divide-border">
          <li v-for="n in 4" :key="n" class="flex items-center gap-3 px-4 py-3">
            <UiSkeleton circle class="size-8" />
            <span class="flex-1 space-y-1.5">
              <UiSkeleton class="h-3 w-40" />
              <UiSkeleton class="h-3 w-56" />
            </span>
            <UiSkeleton class="h-8 w-32" />
          </li>
        </ul>

        <UiErrorState
          v-else-if="error"
          title="Não foi possível carregar a lista"
          :description="error"
          @retry="loadRows"
        />

        <template v-else-if="tab === 'members' && organization">
          <UiEmptyState
            v-if="!members?.results.length"
            :icon="Users"
            title="Nenhum integrante encontrado"
          />
          <ul v-else class="divide-y divide-border">
            <li
              v-for="member in members.results"
              :key="member.id"
              class="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
            >
              <UiAvatar :name="member.name || member.email" />
              <div class="min-w-0 flex-1">
                <p class="flex items-center gap-2 truncate text-14 font-medium text-fg">
                  <span class="truncate">{{ member.name || member.email }}</span>
                  <UiBadge v-if="member.user_id === auth.user?.id">Você</UiBadge>
                </p>
                <p class="truncate text-13 text-fg-muted">{{ member.email }}</p>
              </div>
              <time
                class="hidden shrink-0 text-13 text-fg-muted md:block"
                :datetime="member.joined_at"
              >
                Desde {{ dateFormat.format(new Date(member.joined_at)) }}
              </time>
              <MemberActions
                :organization="organization"
                :member="member"
                class="w-full pl-11 sm:ml-auto sm:w-auto sm:pl-0"
                @changed="reloadMembers"
              />
            </li>
          </ul>
        </template>

        <template v-else-if="tab === 'invitations'">
          <UiEmptyState
            v-if="!invitations?.results.length"
            :icon="Send"
            title="Nenhum convite enviado"
            description="Convide alguém por e-mail para participar desta organização."
          />
          <ul v-else class="divide-y divide-border">
            <li
              v-for="invitation in invitations.results"
              :key="invitation.id"
              class="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
            >
              <UiAvatar :name="invitation.email" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-14 font-medium text-fg">{{ invitation.email }}</p>
                <p class="text-13 text-fg-muted">
                  {{ roleLabels[invitation.role] }} · válido até
                  {{ dateFormat.format(new Date(invitation.expires_at)) }}
                </p>
              </div>
              <UiBadge :tone="inviteStatus(invitation).tone">
                {{ inviteStatus(invitation).label }}
              </UiBadge>
              <UiButton
                v-if="inviteStatus(invitation) === STATUS.pending"
                size="sm"
                :loading="revoking === invitation.id"
                :disabled="!!revoking"
                @click="revoke(invitation)"
              >
                Revogar
              </UiButton>
            </li>
          </ul>
        </template>

        <footer
          v-if="!loading && !error && currentPage && (currentPage.next || currentPage.previous)"
          class="flex items-center justify-between gap-2 border-t border-border px-4 py-2 text-13 text-fg-muted"
        >
          <span>Página {{ page }} · {{ currentPage.count }} no total</span>
          <span class="flex gap-1">
            <UiIconButton
              :icon="ChevronLeft"
              label="Página anterior"
              :disabled="!currentPage.previous"
              @click="changePage(-1)"
            />
            <UiIconButton
              :icon="ChevronRight"
              label="Próxima página"
              :disabled="!currentPage.next"
              @click="changePage(1)"
            />
          </span>
        </footer>
      </section>
    </UiTabs>

    <UiDialog
      v-model:open="inviteOpen"
      title="Convidar para a organização"
      description="Funciona para quem já tem conta e para quem ainda vai criar uma."
      :dismissible="!saving"
    >
      <form id="invite-form" class="flex flex-col gap-4" novalidate @submit.prevent="invite">
        <UiInput
          v-model="email"
          type="email"
          label="E-mail"
          name="invitation-email"
          autocomplete="email"
          maxlength="254"
          required
          :error="emailError"
        />
        <UiSelect v-model="role" label="Papel" :options="roleOptions" />
        <p v-if="formError" role="alert" class="text-13 text-danger">{{ formError }}</p>
      </form>
      <template #footer>
        <UiButton :disabled="saving" @click="inviteOpen = false">Cancelar</UiButton>
        <UiButton type="submit" form="invite-form" variant="primary" :loading="saving">
          Enviar convite
        </UiButton>
      </template>
    </UiDialog>
  </OrganizationLayout>
</template>

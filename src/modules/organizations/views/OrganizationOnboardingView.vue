<script setup lang="ts">
import { ArrowRight, Building2, FolderPlus, ImageUp, Mail, Plus, X } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getErrorMessage } from '@/app/plugins/axios'
import {
  UiBadge,
  UiButton,
  UiCheckbox,
  UiChip,
  UiErrorState,
  UiInput,
  UiSelect,
  UiSkeleton,
} from '@/shared/components'
import { createInvitation, type InviteRole } from '@/modules/invitations'
import OnboardingLayout from '../components/onboardingLayout.vue'
import OrganizationLocationPicker from '../components/organizationLocationPicker.vue'
import {
  createOrganization,
  getOrganization,
  uploadOrganizationLogo,
  listOrganizationSectors,
  createOrganizationSector,
} from '../services'
import { useOrganizationsStore } from '../stores'
import type { Organization, OrganizationLocation, OrganizationSector } from '../types'
import { parseInvitationEmails, slugProblem, TEAM_SIZES, workspaceSlug } from '../utils'

const route = useRoute()
const router = useRouter()
const organizations = useOrganizationsStore()
const organization = ref<Organization | null>(null)
const name = ref('')
const slug = ref('')
const slugEdited = ref(false)
const teamSize = ref<Organization['team_size']>('')
const location = ref<OrganizationLocation | null>(null)
const locationReady = ref(true)
const createdId = ref('')
const workspacePrefix = `${window.location.origin}/w/`
const sectors = ref<OrganizationSector[]>([])
const sectorNames = ref<string[]>(['Marketing', 'Design', 'Desenvolvimento'])
const sectorChoices = ref(['Marketing', 'Design', 'Desenvolvimento', 'Financeiro', 'Comercial'])
const newSector = ref('')
const selectedSectorIds = ref<string[]>([])
const logo = ref<File | null>(null)
const logoUrl = ref('')
const draftEmail = ref('')
const emails = ref<string[]>([])
const sent = ref<string[]>([])
const role = ref<InviteRole>('member')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const fieldErrors = reactive({ name: '', slug: '', teamSize: '' })
const failures = ref<{ email: string; message: string }[]>([])
const organizationId = computed(() =>
  typeof route.params.organizationId === 'string' ? route.params.organizationId : '',
)
const step = computed(() =>
  !organizationId.value ? 1 : route.name === 'OrganizationOnboardingSectors' ? 2 : 3,
)
const wasSent = (email: string) =>
  sent.value.some((value) => value.toLowerCase() === email.toLowerCase())
const remaining = computed(() => emails.value.filter((email) => !wasSent(email)))
const membersTarget = computed(() => ({
  name: 'OrganizationMembers',
  params: { organizationId: organizationId.value },
}))

function chooseLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  logoUrl.value = ''
  logo.value = null
  error.value = ''
  if (!file) return
  if (!['image/png', 'image/svg+xml'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    error.value = 'Escolha uma imagem PNG ou SVG de até 2 MB.'
    input.value = ''
    return
  }
  logo.value = file
}
function validateOrganization() {
  fieldErrors.name = name.value.trim() ? '' : 'Dê um nome para a organização.'
  fieldErrors.slug = !slug.value && !name.value.trim() ? '' : slugProblem(slug.value)
  fieldErrors.teamSize = teamSize.value ? '' : 'Escolha o tamanho da equipe.'
  return !fieldErrors.name && !fieldErrors.slug && !fieldErrors.teamSize
}
async function create() {
  if (saving.value || !locationReady.value) return
  if (!createdId.value && !validateOrganization()) return
  saving.value = true
  error.value = ''
  try {
    if (createdId.value) {
      await router.replace({
        name: 'OrganizationOnboardingSectors',
        params: { organizationId: createdId.value },
      })
      return
    }
    if (logo.value && !logoUrl.value) logoUrl.value = await uploadOrganizationLogo(logo.value)
    const result = await createOrganization({
      name: name.value.trim(),
      description: '',
      slug: slug.value,
      team_size: teamSize.value,
      location: location.value,
      ...(logoUrl.value ? { logo_url: logoUrl.value } : {}),
    })
    organizations.organizations.push(result)
    organization.value = result
    createdId.value = result.id
    await router.replace({
      name: 'OrganizationOnboardingSectors',
      params: { organizationId: result.id },
    })
  } catch (cause) {
    error.value = getErrorMessage(cause, 'Não foi possível criar sua organização. Tente novamente.')
  } finally {
    saving.value = false
  }
}
function toggleSector(name: string) {
  sectorNames.value = sectorNames.value.includes(name)
    ? sectorNames.value.filter((value) => value !== name)
    : [...sectorNames.value, name]
}
function addSector() {
  const name = newSector.value.trim()
  if (!name) return
  const existing = sectorChoices.value.find((value) => value.toLowerCase() === name.toLowerCase())
  if (!existing) sectorChoices.value.push(name)
  if (!sectorNames.value.includes(existing || name)) sectorNames.value.push(existing || name)
  newSector.value = ''
}
async function saveSectors() {
  if (saving.value) return
  addSector()
  saving.value = true
  error.value = ''
  try {
    for (const name of sectorNames.value) {
      if (!sectors.value.some((sector) => sector.name.toLowerCase() === name.toLowerCase())) {
        sectors.value.push(await createOrganizationSector(organizationId.value, name))
      }
    }
    await router.replace({
      name: 'OrganizationOnboardingTeam',
      params: { organizationId: organizationId.value },
    })
  } catch (cause) {
    error.value = getErrorMessage(
      cause,
      'Não foi possível criar os projetos. Os que já foram criados continuam salvos.',
    )
  } finally {
    saving.value = false
  }
}
function addEmails(): boolean {
  const additions = parseInvitationEmails(draftEmail.value)
  if (additions.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    error.value = 'Algum e-mail está incorreto. Confira antes de continuar.'
    return false
  }
  emails.value = parseInvitationEmails([...emails.value, ...additions].join(','))
  draftEmail.value = ''
  error.value = ''
  return true
}
async function sendInvitations() {
  if (saving.value || !organization.value || !addEmails()) return
  if (!remaining.value.length) {
    error.value = 'Adicione pelo menos um e-mail ou pule esta etapa.'
    return
  }
  if (role.value === 'guest' && !selectedSectorIds.value.length) {
    error.value = 'Marque pelo menos um projeto para o convidado externo.'
    return
  }
  saving.value = true
  failures.value = []
  const pending = [...remaining.value]
  try {
    for (const email of pending) {
      try {
        await createInvitation(organizationId.value, {
          email,
          role: role.value,
          sector_ids: selectedSectorIds.value,
        })
        sent.value.push(email)
      } catch (cause) {
        failures.value.push({
          email,
          message: getErrorMessage(cause, 'Não foi possível enviar o convite.'),
        })
      }
    }
    if (!failures.value.length) await router.replace(membersTarget.value)
  } finally {
    saving.value = false
  }
}
async function loadOrganization() {
  error.value = ''
  organization.value = null
  emails.value = []
  sent.value = []
  failures.value = []
  if (!organizationId.value) return
  const id = organizationId.value
  loading.value = true
  try {
    const result = await getOrganization(id)
    if (id !== organizationId.value) return
    if (!['owner', 'admin'].includes(result.current_role)) {
      error.value = 'Somente proprietários e administradores podem convidar pessoas.'
      return
    }
    const items: OrganizationSector[] = []
    let page = 1
    while (true) {
      const response = await listOrganizationSectors(id, page++)
      items.push(...response.results)
      if (!response.next) break
    }
    if (id !== organizationId.value) return
    organization.value = result
    sectors.value = items
    selectedSectorIds.value = items.map((sector) => sector.id)
    if (items.length) {
      sectorNames.value = items.map((sector) => sector.name)
      sectorChoices.value = [...new Set([...sectorChoices.value, ...sectorNames.value])]
    }
  } catch (cause) {
    error.value = getErrorMessage(cause, 'Não foi possível abrir sua organização.')
  } finally {
    if (id === organizationId.value) loading.value = false
  }
}
watch([organizationId, () => route.name], loadOrganization, { immediate: true })
watch(name, (value) => {
  if (!slugEdited.value) slug.value = workspaceSlug(value)
})
</script>

<template>
  <OnboardingLayout
    :step="step"
    :steps="['Organização', 'Projetos', 'Equipe']"
    :title="
      step === 1
        ? 'Sobre sua organização'
        : step === 2
          ? 'Crie seus primeiros projetos'
          : 'Convide sua equipe'
    "
    :description="
      step === 1
        ? 'Essas informações aparecem para todos os membros.'
        : step === 2
          ? 'Cada projeto tem o próprio quadro de tarefas. Você pode criar outros depois.'
          : 'Cada pessoa recebe um convite por e-mail. Os papéis podem mudar depois.'
    "
  >
    <form v-if="step === 1" class="flex flex-col gap-5" novalidate @submit.prevent="create">
      <UiInput
        id="organization-name"
        v-model="name"
        label="Nome da organização"
        size="lg"
        :icon="Building2"
        :error="fieldErrors.name"
        name="organization-name"
        maxlength="255"
        placeholder="Norte Studio"
        :disabled="saving || !!createdId"
      />
      <UiInput
        id="organization-slug"
        v-model="slug"
        label="Endereço do workspace"
        size="lg"
        :hint="`${workspacePrefix}${slug || 'norte-studio'}`"
        :error="fieldErrors.slug"
        name="organization-slug"
        maxlength="63"
        placeholder="norte-studio"
        :disabled="saving || !!createdId"
        @input="slugEdited = true"
      />
      <UiSelect
        id="organization-team-size"
        v-model="teamSize"
        label="Tamanho da equipe"
        size="lg"
        placeholder="Selecione o tamanho"
        :options="TEAM_SIZES"
        :error="fieldErrors.teamSize"
        :disabled="saving || !!createdId"
      />

      <div class="flex flex-col gap-1.5">
        <span class="text-13 font-medium text-fg">
          Logo <span class="font-normal text-fg-muted">(opcional)</span>
        </span>
        <label
          :class="[
            'flex h-11 cursor-pointer items-center gap-2.5 rounded-control border border-dashed border-border-strong px-3.5 text-14 text-fg-muted',
            'transition-colors duration-(--dur-fast) ease-out hover:bg-surface-2 hover:text-fg',
            'focus-within:outline-2 focus-within:outline-accent',
            saving || createdId ? 'pointer-events-none opacity-50' : '',
          ]"
        >
          <ImageUp :size="16" aria-hidden="true" />
          <span class="truncate">{{ logo?.name || 'Escolher PNG ou SVG, até 2 MB' }}</span>
          <input
            type="file"
            name="organization-logo"
            accept="image/png,image/svg+xml"
            class="sr-only"
            :disabled="saving || !!createdId"
            @change="chooseLogo"
          />
        </label>
      </div>

      <OrganizationLocationPicker
        v-model="location"
        :disabled="saving || !!createdId"
        @ready="locationReady = $event"
      />

      <p
        v-if="error"
        role="alert"
        class="rounded-control bg-danger-soft px-3 py-2.5 text-13 text-danger"
      >
        {{ error }}
      </p>
      <UiButton
        type="submit"
        variant="primary"
        size="xl"
        block
        :icon-right="ArrowRight"
        :loading="saving"
        :disabled="!locationReady"
        class="mt-2"
      >
        Continuar
      </UiButton>
    </form>

    <div v-else-if="loading" class="flex flex-col gap-3" role="status" aria-label="Carregando">
      <UiSkeleton class="h-8 w-2/3" />
      <UiSkeleton class="h-11" />
      <UiSkeleton class="h-11" />
    </div>

    <form
      v-else-if="organization && step === 2"
      class="flex flex-col gap-5"
      @submit.prevent="saveSectors"
    >
      <fieldset>
        <legend class="mb-2 text-13 font-medium text-fg">Sugestões</legend>
        <div class="flex flex-wrap gap-2">
          <UiChip
            v-for="choice in sectorChoices"
            :key="choice"
            :pressed="sectorNames.includes(choice)"
            :disabled="saving"
            @click="toggleSector(choice)"
          >
            {{ choice }}
          </UiChip>
        </div>
      </fieldset>
      <div class="flex items-end gap-2">
        <UiInput
          id="new-sector"
          v-model="newSector"
          label="Outro projeto"
          size="lg"
          :icon="FolderPlus"
          name="new-sector"
          maxlength="255"
          placeholder="Ex.: Atendimento"
          :disabled="saving"
          class="flex-1"
          @keydown.enter.prevent="addSector"
        />
        <UiButton size="xl" :icon="Plus" :disabled="saving || !newSector.trim()" @click="addSector">
          Adicionar
        </UiButton>
      </div>
      <p class="text-13 text-fg-muted">
        {{
          sectorNames.length
            ? `${sectorNames.length} projeto${sectorNames.length === 1 ? '' : 's'} selecionado${sectorNames.length === 1 ? '' : 's'}.`
            : 'Nenhum projeto selecionado. Você pode pular e criar depois.'
        }}
      </p>

      <p
        v-if="error"
        role="alert"
        class="rounded-control bg-danger-soft px-3 py-2.5 text-13 text-danger"
      >
        {{ error }}
      </p>
      <UiButton
        type="submit"
        variant="primary"
        size="xl"
        block
        :icon-right="ArrowRight"
        :loading="saving"
        class="mt-2"
      >
        Continuar
      </UiButton>
      <RouterLink
        v-if="!saving"
        :to="{ name: 'OrganizationOnboardingTeam', params: { organizationId } }"
        class="self-center rounded-[4px] text-14 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        Pular por agora
      </RouterLink>
    </form>

    <form
      v-else-if="organization"
      class="flex flex-col gap-5"
      novalidate
      @submit.prevent="sendInvitations"
    >
      <div class="flex flex-col gap-1.5">
        <label for="invitation-emails" class="text-13 font-medium text-fg">E-mails</label>
        <div
          class="flex min-h-11 flex-wrap items-center gap-1.5 rounded-control border border-border bg-surface-2 px-2.5 py-1.5 transition-colors duration-(--dur-fast) ease-out focus-within:border-accent hover:border-border-strong"
        >
          <Mail v-if="!emails.length" :size="16" class="ml-1 text-fg-muted" aria-hidden="true" />
          <UiBadge
            v-for="email in emails"
            :key="email"
            :tone="wasSent(email) ? 'success' : 'neutral'"
          >
            {{ email }}
            <button
              v-if="!wasSent(email)"
              type="button"
              :aria-label="`Remover ${email}`"
              :disabled="saving"
              class="-mr-0.5 grid size-4 cursor-pointer place-items-center rounded-[3px] hover:bg-surface-3"
              @click="emails = emails.filter((value) => value !== email)"
            >
              <X :size="12" aria-hidden="true" />
            </button>
          </UiBadge>
          <input
            id="invitation-emails"
            v-model="draftEmail"
            name="invitation-emails"
            aria-describedby="invitation-emails-hint"
            placeholder="nome@empresa.com"
            :disabled="saving"
            class="h-7 min-w-40 flex-1 bg-transparent px-1 text-14 text-fg outline-none placeholder:text-fg-muted"
            @keydown.enter.prevent="addEmails"
            @blur="draftEmail && addEmails()"
          />
        </div>
        <p id="invitation-emails-hint" class="text-12 text-fg-muted">
          Separe por vírgula ou pressione Enter.
        </p>
      </div>

      <UiSelect
        id="invitation-role"
        v-model="role"
        label="Papel inicial"
        size="lg"
        :options="[
          { value: 'member', label: 'Membro: cria e edita tarefas' },
          { value: 'viewer', label: 'Leitor: só visualiza' },
          { value: 'guest', label: 'Convidado externo: só os projetos marcados abaixo' },
          ...(organization.current_role === 'owner'
            ? [{ value: 'admin', label: 'Administrador: gerencia a organização' }]
            : []),
        ]"
        :disabled="saving"
      />

      <fieldset v-if="sectors.length">
        <legend class="mb-2 text-13 font-medium text-fg">Acesso aos projetos</legend>
        <p v-if="role === 'guest'" class="mb-2 text-12 text-fg-muted">
          Convidados externos (clientes, freelancers) veem só estes projetos. Não aparecem para eles
          a equipe, as mensagens, os relatórios nem os outros projetos.
        </p>
        <div class="grid gap-2 sm:grid-cols-2">
          <UiCheckbox
            v-for="sector in sectors"
            :key="sector.id"
            :model-value="selectedSectorIds.includes(sector.id)"
            :label="sector.name"
            :disabled="saving"
            @update:model-value="
              selectedSectorIds = $event
                ? [...selectedSectorIds, sector.id]
                : selectedSectorIds.filter((id) => id !== sector.id)
            "
          />
        </div>
      </fieldset>

      <p
        v-if="error"
        role="alert"
        class="rounded-control bg-danger-soft px-3 py-2.5 text-13 text-danger"
      >
        {{ error }}
      </p>
      <ul v-if="failures.length" class="flex flex-col gap-1.5" role="alert">
        <li
          v-for="failure in failures"
          :key="failure.email"
          class="rounded-control bg-danger-soft px-3 py-2 text-13 text-danger"
        >
          {{ failure.email }}: {{ failure.message }}
        </li>
      </ul>

      <UiButton
        type="submit"
        variant="primary"
        size="xl"
        block
        :icon-right="ArrowRight"
        :loading="saving"
        class="mt-2"
      >
        {{
          remaining.length
            ? `Enviar ${remaining.length} convite${remaining.length === 1 ? '' : 's'} e concluir`
            : 'Enviar convites e concluir'
        }}
      </UiButton>
      <RouterLink
        v-if="!saving"
        :to="membersTarget"
        class="self-center rounded-[4px] text-14 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        {{ sent.length ? 'Abrir organização' : 'Pular por agora' }}
      </RouterLink>
    </form>

    <UiErrorState v-else :description="error" @retry="loadOrganization" />
  </OnboardingLayout>
</template>

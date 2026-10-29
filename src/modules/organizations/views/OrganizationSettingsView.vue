<script setup lang="ts">
import { Trash2, Upload } from '@lucide/vue'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  UiAvatar,
  UiButton,
  UiErrorState,
  UiInput,
  UiPanel,
  UiSelect,
  UiSkeleton,
  UiTextarea,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import OrganizationLayout from '../components/organizationLayout.vue'
import { useOrganizationAdmin } from '../composables/useOrganizationAdmin'
import { deleteOrganization, updateOrganization, uploadOrganizationLogo } from '../services'
import type { Organization } from '../types'
import { slugProblem, TEAM_SIZES } from '../utils'

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const { id, organization, loading, saving, error, canAdmin, load, mutate } = useOrganizationAdmin()
const router = useRouter()
const confirm = useConfirm()
const name = ref('')
const slug = ref('')
const description = ref('')
const teamSize = ref<Organization['team_size']>('')
const logoUrl = ref('')
const logoFile = ref<File | null>(null)
const ready = ref(false)
const logoPreview = ref('')
const fieldErrors = reactive({ name: '', slug: '', logo: '' })
const shownLogo = computed(() => logoPreview.value || logoUrl.value)
const teamSizes = [{ value: '', label: 'Não informado' }, ...TEAM_SIZES]
const revokePreview = () => logoPreview.value && URL.revokeObjectURL(logoPreview.value)
onBeforeUnmount(revokePreview)

async function initialize() {
  ready.value = false
  const organizationId = id.value
  logoFile.value = null
  revokePreview()
  logoPreview.value = ''
  Object.assign(fieldErrors, { name: '', slug: '', logo: '' })
  await load()
  if (!organization.value || organizationId !== id.value) return
  name.value = organization.value.name
  slug.value = organization.value.slug
  description.value = organization.value.description
  teamSize.value = organization.value.team_size
  logoUrl.value = organization.value.logo_url
  ready.value = true
}

function selectLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  fieldErrors.logo = ''
  if (file && !LOGO_TYPES.includes(file.type)) {
    fieldErrors.logo = 'Escolha uma imagem PNG, JPG ou WebP.'
    input.value = ''
    return
  }
  logoFile.value = file
  revokePreview()
  logoPreview.value = file ? URL.createObjectURL(file) : ''
}

function removeLogo() {
  logoUrl.value = ''
  logoFile.value = null
  revokePreview()
  logoPreview.value = ''
}

function validate() {
  fieldErrors.name = name.value.trim() ? '' : 'Dê um nome para a organização.'
  fieldErrors.slug = slugProblem(slug.value.trim())
  return !fieldErrors.name && !fieldErrors.slug
}

async function save() {
  if (!validate()) return
  const organizationId = id.value
  const file = logoFile.value
  const payload = {
    name: name.value.trim(),
    slug: slug.value.trim(),
    description: description.value.trim(),
    team_size: teamSize.value,
    logo_url: logoUrl.value,
  }
  await mutate(async () => {
    if (file) payload.logo_url = await uploadOrganizationLogo(file)
    await updateOrganization(organizationId, payload)
  }, initialize)
}

async function removeOrganization() {
  const current = organization.value
  if (!current || current.is_personal || current.current_role !== 'owner') return
  const confirmed = await confirm({
    title: `Desativar “${current.name}”?`,
    description:
      'Todos os integrantes perdem o acesso aos projetos e tarefas. A restauração ainda não está disponível pela interface.',
    confirmLabel: 'Desativar organização',
    danger: true,
  })
  if (!confirmed) return
  await mutate(
    () => deleteOrganization(current.id),
    async () => {
      await router.push({ name: 'Organizations' })
    },
  )
}

watch(id, initialize, { immediate: true })
</script>

<template>
  <OrganizationLayout
    title="Configurações"
    :description="organization ? `Identidade e dados de ${organization.name}.` : undefined"
    :organization-id="organization?.id"
  >
    <div v-if="loading && !ready" class="grid gap-4" aria-label="Carregando">
      <UiSkeleton class="h-72 rounded-card" />
      <UiSkeleton class="h-28 rounded-card" />
    </div>

    <UiErrorState
      v-else-if="error && !ready"
      title="Não foi possível carregar as configurações"
      :description="error"
      @retry="initialize"
    />

    <template v-else-if="organization && ready">
      <UiPanel
        title="Dados da organização"
        :description="
          canAdmin
            ? undefined
            : 'Somente proprietários e administradores podem alterar estes dados.'
        "
        heading-id="settings-general"
      >
        <form novalidate @submit.prevent="save">
          <fieldset :disabled="!canAdmin || saving" class="grid min-w-0 gap-5">
            <div class="flex flex-wrap items-center gap-4">
              <img
                v-if="shownLogo"
                :src="shownLogo"
                alt="Logomarca da organização"
                class="size-16 rounded-card border border-border object-cover"
              />
              <UiAvatar
                v-else
                :name="name || '?'"
                size="lg"
                class="size-16! rounded-card! text-20!"
              />
              <div class="grid gap-1.5">
                <span class="flex flex-wrap gap-2">
                  <label
                    class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-control border border-border bg-surface-1 px-3 text-13 font-medium text-fg transition-colors duration-(--dur-fast) ease-out focus-within:outline-2 focus-within:outline-accent hover:bg-surface-2"
                  >
                    <Upload :size="16" aria-hidden="true" />
                    {{ shownLogo ? 'Trocar logomarca' : 'Enviar logomarca' }}
                    <input
                      :key="id"
                      type="file"
                      class="sr-only"
                      :accept="LOGO_TYPES.join(',')"
                      @change="selectLogo"
                    />
                  </label>
                  <UiButton v-if="shownLogo" variant="ghost" @click="removeLogo">Remover</UiButton>
                </span>
                <p
                  :class="['text-12', fieldErrors.logo ? 'text-danger' : 'text-fg-muted']"
                  :role="fieldErrors.logo ? 'alert' : undefined"
                >
                  {{ fieldErrors.logo || 'PNG, JPG ou WebP.' }}
                </p>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <UiInput
                v-model="name"
                label="Nome"
                maxlength="255"
                required
                :error="fieldErrors.name"
              />
              <UiInput
                v-model="slug"
                label="Endereço"
                maxlength="63"
                required
                :hint="`/w/${slug || 'endereco'} · alterar pode invalidar links antigos.`"
                :error="fieldErrors.slug"
              />
              <UiTextarea v-model="description" label="Descrição" class="sm:col-span-2" />
              <UiSelect v-model="teamSize" label="Tamanho da equipe" :options="teamSizes" />
            </div>

            <p v-if="error" role="alert" class="text-13 text-danger">{{ error }}</p>

            <div v-if="canAdmin" class="flex justify-end">
              <UiButton type="submit" variant="primary" :loading="saving">
                Salvar alterações
              </UiButton>
            </div>
          </fieldset>
        </form>
      </UiPanel>

      <UiPanel
        v-if="organization.current_role === 'owner' && !organization.is_personal"
        title="Desativar organização"
        description="Interrompe o acesso de todos os integrantes a projetos e tarefas."
        heading-id="settings-danger"
        class="border-danger/40"
      >
        <UiButton
          variant="danger"
          :icon="Trash2"
          :disabled="saving"
          class="self-start"
          @click="removeOrganization"
        >
          Desativar organização
        </UiButton>
      </UiPanel>
    </template>
  </OrganizationLayout>
</template>

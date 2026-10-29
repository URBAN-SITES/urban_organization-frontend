<script setup lang="ts">
import { ArrowRight, Building2, Plus, Settings } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getErrorMessage } from '@/app/plugins/axios'
import { InvitationsInbox } from '@/modules/invitations'
import {
  UiAvatar,
  UiBadge,
  UiButton,
  UiEmptyState,
  UiErrorState,
  UiIconButton,
  UiSkeleton,
} from '@/shared/components'
import OrganizationLayout from '../components/organizationLayout.vue'
import { useOrganizationsStore } from '../stores'
import type { Organization } from '../types'
import { roleLabels } from '../utils'

const store = useOrganizationsStore()
const router = useRouter()
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    await store.load()
  } catch (cause) {
    error.value = getErrorMessage(cause, 'Verifique sua conexão e tente de novo.')
  } finally {
    loading.value = false
  }
}
onMounted(load)

function open(organization: Organization) {
  store.select(organization.id)
  void router.push('/')
}
</script>

<template>
  <OrganizationLayout
    title="Organizações"
    description="Escolha seu espaço de trabalho ou crie uma organização."
  >
    <template #actions>
      <UiButton
        variant="primary"
        :icon="Plus"
        @click="router.push({ name: 'OrganizationOnboarding' })"
      >
        Criar organização
      </UiButton>
    </template>

    <InvitationsInbox />

    <ul v-if="loading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Carregando">
      <li v-for="n in 3" :key="n"><UiSkeleton class="h-32 rounded-card" /></li>
    </ul>
    <UiErrorState
      v-else-if="error"
      title="Não foi possível carregar suas organizações"
      :description="error"
      @retry="load"
    />
    <UiEmptyState
      v-else-if="!store.organizations.length"
      :icon="Building2"
      title="Você ainda não participa de uma organização"
      description="Crie uma para organizar projetos com seu time."
    />
    <ul v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="organization in store.organizations"
        :key="organization.id"
        :class="[
          'flex flex-col gap-4 rounded-card border bg-surface-1 p-4',
          store.current?.id === organization.id ? 'border-border-strong' : 'border-border',
        ]"
      >
        <div class="flex items-start gap-3">
          <img
            v-if="organization.logo_url"
            :src="organization.logo_url"
            alt=""
            class="size-10 rounded-control border border-border object-cover"
          />
          <UiAvatar v-else :name="organization.name" size="lg" class="rounded-control!" />
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-14 font-semibold text-fg">{{ organization.name }}</h2>
            <p class="text-12 text-fg-muted">
              {{ organization.is_personal ? 'Espaço pessoal' : 'Organização' }}
            </p>
          </div>
          <UiBadge v-if="store.current?.id === organization.id" tone="accent">Atual</UiBadge>
        </div>
        <p v-if="organization.description" class="line-clamp-2 text-13 text-fg-muted">
          {{ organization.description }}
        </p>
        <div class="mt-auto flex items-center justify-between gap-2">
          <UiBadge>{{ roleLabels[organization.current_role] }}</UiBadge>
          <span class="flex items-center gap-1">
            <UiIconButton
              :icon="Settings"
              :label="`Gerenciar ${organization.name}`"
              @click="
                router.push({
                  name: 'OrganizationMembers',
                  params: { organizationId: organization.id },
                })
              "
            />
            <UiButton size="sm" :icon-right="ArrowRight" @click="open(organization)">
              Abrir
            </UiButton>
          </span>
        </div>
      </li>
    </ul>
  </OrganizationLayout>
</template>

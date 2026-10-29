<script setup lang="ts">
import { LogOut, MoreHorizontal, UserMinus } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { useAuthStore } from '@/modules/auth'
import { UiBadge, UiIconButton, UiMenu, UiSelect, type MenuItem } from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import type { Organization, OrganizationMember, OrganizationRole } from '../types'
import { removeMember, updateMemberRole } from '../services'
import { useOrganizationsStore } from '../stores'
import { roleLabels } from '../utils'
import { canManageMember, assignableRoles } from '../utils/permissions'

const props = defineProps<{ organization: Organization; member: OrganizationMember }>()
const emit = defineEmits<{ changed: [] }>()
const auth = useAuthStore()
const router = useRouter()
const store = useOrganizationsStore()
const confirm = useConfirm()
const saving = ref(false)
// cópia local do papel: volta ao valor do servidor se a troca falhar
const role = ref<OrganizationRole>(props.member.role)
watch(
  () => props.member.role,
  (value) => (role.value = value),
)
const isSelf = computed(() => props.member.user_id === auth.user?.id)
const canEdit = computed(() => canManageMember(props.organization.current_role, props.member.role))
const roleOptions = computed(() =>
  assignableRoles(props.organization.current_role).map((value) => ({
    value,
    label: roleLabels[value],
  })),
)
const displayName = computed(() => props.member.name || props.member.email)
const menu = computed<MenuItem[]>(() => {
  if (isSelf.value && props.member.role !== 'owner')
    return [{ label: 'Sair da organização', icon: LogOut, danger: true, onSelect: () => remove() }]
  if (canEdit.value)
    return [
      { label: 'Remover da organização', icon: UserMinus, danger: true, onSelect: () => remove() },
    ]
  return []
})

async function changeRole(value: string) {
  const next = roleOptions.value.find((option) => option.value === value)?.value
  if (!next || next === props.member.role) return
  const saved = await save(
    () => updateMemberRole(props.organization.id, props.member.id, { role: next }),
    'Papel atualizado.',
  )
  if (!saved) role.value = props.member.role
}

async function remove() {
  const leaving = isSelf.value
  const confirmed = await confirm({
    title: leaving ? 'Sair desta organização?' : `Remover ${displayName.value}?`,
    description: leaving
      ? 'Você perderá o acesso aos times e projetos desta organização.'
      : 'Os acessos aos times e projetos desta organização serão revogados.',
    confirmLabel: leaving ? 'Sair' : 'Remover',
    danger: true,
  })
  if (!confirmed) return
  const removed = await save(
    () => removeMember(props.organization.id, props.member.id),
    'Participação removida.',
  )
  if (removed && leaving) {
    await store.load()
    await router.push({ name: 'Organizations' })
  }
}

async function save(action: () => Promise<unknown>, success: string): Promise<boolean> {
  if (saving.value) return false
  const organizationId = props.organization.id
  saving.value = true
  try {
    await action()
    if (props.organization.id !== organizationId) return false
    toast.success(success)
    emit('changed')
    return true
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível alterar a participação.'))
    return false
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-end gap-1">
    <UiSelect
      v-if="canEdit"
      v-model="role"
      :options="roleOptions"
      :disabled="saving"
      :aria-label="`Papel de ${displayName}`"
      class="w-40"
      @update:model-value="changeRole"
    />
    <UiBadge v-else>
      {{ roleLabels[member.role] }}
    </UiBadge>
    <UiMenu
      v-if="menu.length"
      :items="menu"
      :label="`Ações para ${displayName}`"
      placement="bottom-end"
    >
      <template #trigger="{ props: trigger }">
        <UiIconButton
          v-bind="trigger"
          :icon="MoreHorizontal"
          :label="`Ações para ${displayName}`"
          :loading="saving"
        />
      </template>
    </UiMenu>
    <span v-else class="size-9" aria-hidden="true" />
  </div>
</template>

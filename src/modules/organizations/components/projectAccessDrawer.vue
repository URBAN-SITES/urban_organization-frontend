<script setup lang="ts">
import { Trash2, UserPlus, UsersRound } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import {
  addSectorMember,
  addSectorTeam,
  listSectorMembers,
  listSectorTeams,
  removeSectorMember,
  removeSectorTeam,
  updateSectorMember,
  updateSectorTeam,
  type Sector,
  type SectorMember,
  type SectorRole,
  type SectorTeam,
} from '@/modules/module'
import { listTeams, type Team } from '@/modules/teams'
import {
  UiAvatar,
  UiButton,
  UiDrawer,
  UiErrorState,
  UiIconButton,
  UiSelect,
  UiSkeleton,
} from '@/shared/components'
import { useConfirm } from '@/shared/composables/confirm'
import { fetchAllPages } from '@/shared/utils'
import { listMembers } from '../services'
import type { OrganizationMember } from '../types'

/** Quem acessa o projeto: participantes diretos e times vinculados (só gestores alteram). */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ organizationId: string; project: Sector | null }>()
const confirm = useConfirm()

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Gestor' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Leitor' },
]
const members = ref<SectorMember[]>([])
const links = ref<SectorTeam[]>([])
const people = ref<OrganizationMember[]>([])
const teams = ref<Team[]>([])
const loading = ref(false)
const error = ref('')
const busy = ref(false)
const personId = ref('')
const personRole = ref('editor')
const teamId = ref('')
const teamRole = ref('editor')
let version = 0

const personOptions = computed(() =>
  people.value
    .filter((person) => !members.value.some((member) => member.user_id === person.user_id))
    .map((person) => ({ value: person.user_id, label: person.name || person.email })),
)
const teamOptions = computed(() =>
  teams.value
    .filter((team) => !links.value.some((link) => link.team_id === team.id))
    .map((team) => ({ value: team.id, label: team.name })),
)

function isRole(value: string): value is SectorRole {
  return ROLE_OPTIONS.some((option) => option.value === value)
}

async function load() {
  const project = props.project
  if (!project) return
  const request = ++version
  loading.value = true
  error.value = ''
  try {
    const [memberRows, linkRows, peopleRows, teamRows] = await Promise.all([
      fetchAllPages((page) => listSectorMembers(project.id, page)),
      fetchAllPages((page) => listSectorTeams(project.id, page)),
      fetchAllPages((page) => listMembers(props.organizationId, page)),
      fetchAllPages((page) => listTeams(props.organizationId, page)),
    ])
    if (request !== version) return
    members.value = memberRows
    links.value = linkRows
    people.value = peopleRows
    teams.value = teamRows
  } catch (cause) {
    if (request === version) error.value = getErrorMessage(cause, 'Tente novamente.')
  } finally {
    if (request === version) loading.value = false
  }
}

watch(open, (value) => {
  personId.value = ''
  teamId.value = ''
  if (value) void load()
  else version++
})

async function run(action: () => Promise<unknown>, success: string): Promise<boolean> {
  if (busy.value) return false
  busy.value = true
  try {
    await action()
    toast.success(success)
    await load()
    return true
  } catch (cause) {
    toast.error(getErrorMessage(cause, 'Não foi possível alterar o acesso.'))
    await load()
    return false
  } finally {
    busy.value = false
  }
}

async function addPerson() {
  const project = props.project
  if (!project || !personId.value || !isRole(personRole.value)) return
  const role = personRole.value
  if (
    await run(
      () => addSectorMember(project.id, { user_id: personId.value, role }),
      'Pessoa adicionada.',
    )
  )
    personId.value = ''
}

async function addTeam() {
  const project = props.project
  if (!project || !teamId.value || !isRole(teamRole.value)) return
  const role = teamRole.value
  if (
    await run(() => addSectorTeam(project.id, { team_id: teamId.value, role }), 'Time vinculado.')
  )
    teamId.value = ''
}

function changeRole(row: SectorMember | SectorTeam, value: string, isTeam: boolean) {
  const project = props.project
  if (!project || !isRole(value) || value === row.role) return
  void run(
    () =>
      isTeam
        ? updateSectorTeam(project.id, row.id, value)
        : updateSectorMember(project.id, row.id, value),
    'Papel atualizado.',
  )
}

async function remove(row: SectorMember | SectorTeam, isTeam: boolean) {
  const project = props.project
  if (!project) return
  const name = isTeam
    ? (row as SectorTeam).team_name
    : (row as SectorMember).name || (row as SectorMember).email
  const confirmed = await confirm({
    title: isTeam ? `Desvincular o time ${name}?` : `Remover ${name} do projeto?`,
    description:
      'Quem tiver acesso por outro caminho (outro time, participação direta ou papel na organização) continua vendo o projeto.',
    confirmLabel: isTeam ? 'Desvincular' : 'Remover',
    danger: true,
  })
  if (!confirmed) return
  void run(
    () => (isTeam ? removeSectorTeam(project.id, row.id) : removeSectorMember(project.id, row.id)),
    isTeam ? 'Time desvinculado.' : 'Pessoa removida.',
  )
}
</script>

<template>
  <UiDrawer
    v-model:open="open"
    :title="project ? `Acesso a ${project.name}` : 'Acesso'"
    :description="
      project?.is_private
        ? 'Projeto privado: só quem está aqui (e os administradores) vê.'
        : 'Projeto visível: todos da organização veem como leitores.'
    "
    width="md"
  >
    <div v-if="loading && !members.length" class="grid gap-3" aria-label="Carregando">
      <UiSkeleton v-for="n in 4" :key="n" class="h-10" />
    </div>
    <UiErrorState
      v-else-if="error"
      title="Não foi possível carregar o acesso"
      :description="error"
      @retry="load"
    />
    <div v-else class="grid gap-6">
      <section aria-labelledby="access-people" class="grid gap-3">
        <h3 id="access-people" class="text-13 font-semibold text-fg">Pessoas</h3>
        <form class="flex flex-wrap items-end gap-2" @submit.prevent="addPerson">
          <UiSelect
            v-model="personId"
            label="Pessoa da organização"
            placeholder="Escolha alguém"
            :options="personOptions"
            :disabled="busy || !personOptions.length"
            class="min-w-0 flex-1"
          />
          <UiSelect v-model="personRole" aria-label="Papel" :options="ROLE_OPTIONS" class="w-28" />
          <UiButton type="submit" :icon="UserPlus" :disabled="!personId || busy"
            >Adicionar</UiButton
          >
        </form>
        <ul class="divide-y divide-border rounded-card border border-border">
          <li v-for="member in members" :key="member.id" class="flex items-center gap-3 px-3 py-2">
            <UiAvatar :name="member.name || member.email" size="sm" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-13 text-fg">{{ member.name || member.email }}</span>
              <span class="block truncate text-12 text-fg-muted">{{ member.email }}</span>
            </span>
            <UiSelect
              :model-value="member.role"
              :aria-label="`Papel de ${member.name || member.email}`"
              :options="ROLE_OPTIONS"
              :disabled="busy"
              class="w-28"
              @update:model-value="changeRole(member, $event, false)"
            />
            <UiIconButton
              :icon="Trash2"
              :label="`Remover ${member.name || member.email}`"
              :disabled="busy"
              @click="remove(member, false)"
            />
          </li>
          <li v-if="!members.length" class="px-3 py-4 text-13 text-fg-muted">
            Nenhum participante direto.
          </li>
        </ul>
      </section>

      <section aria-labelledby="access-teams" class="grid gap-3">
        <h3 id="access-teams" class="text-13 font-semibold text-fg">Times</h3>
        <form class="flex flex-wrap items-end gap-2" @submit.prevent="addTeam">
          <UiSelect
            v-model="teamId"
            label="Time"
            :placeholder="teamOptions.length ? 'Escolha um time' : 'Nenhum time disponível'"
            :options="teamOptions"
            :disabled="busy || !teamOptions.length"
            class="min-w-0 flex-1"
          />
          <UiSelect
            v-model="teamRole"
            aria-label="Papel do time"
            :options="ROLE_OPTIONS"
            class="w-28"
          />
          <UiButton type="submit" :icon="UsersRound" :disabled="!teamId || busy">Vincular</UiButton>
        </form>
        <ul class="divide-y divide-border rounded-card border border-border">
          <li v-for="link in links" :key="link.id" class="flex items-center gap-3 px-3 py-2">
            <span class="min-w-0 flex-1 truncate text-13 text-fg">{{ link.team_name }}</span>
            <UiSelect
              :model-value="link.role"
              :aria-label="`Papel do time ${link.team_name}`"
              :options="ROLE_OPTIONS"
              :disabled="busy"
              class="w-28"
              @update:model-value="changeRole(link, $event, true)"
            />
            <UiIconButton
              :icon="Trash2"
              :label="`Desvincular ${link.team_name}`"
              :disabled="busy"
              @click="remove(link, true)"
            />
          </li>
          <li v-if="!links.length" class="px-3 py-4 text-13 text-fg-muted">
            Nenhum time vinculado.
          </li>
        </ul>
      </section>
    </div>
  </UiDrawer>
</template>

<script setup lang="ts">
import { Gauge } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/app/plugins/axios'
import { UiAvatar, UiEmptyState, UiSkeleton } from '@/shared/components'
import { getWorkload } from '../services'
import type { Workload } from '../types'
import { formatMinutes } from '../utils/duration'

/**
 * Carga de trabalho do projeto: quanto cada pessoa tem aberto, atrasado, para esta semana,
 * em pontos e em horas lançadas nos últimos 7 dias. Recarrega quando as tarefas mudam.
 */
const props = defineProps<{ sectorId: string; version: number }>()
const emit = defineEmits<{ show: [assignee: string] }>()

const data = ref<Workload | null>(null)
const loading = ref(true)

watch(
  () => [props.sectorId, props.version] as const,
  async ([id]) => {
    try {
      const loaded = await getWorkload(id)
      if (id === props.sectorId) data.value = loaded
    } catch (cause) {
      toast.error(getErrorMessage(cause, 'Não foi possível carregar a carga de trabalho.'))
    } finally {
      if (id === props.sectorId) loading.value = false
    }
  },
  { immediate: true },
)

// a barra compara as pessoas entre si: a mais carregada ocupa a largura toda
const most = computed(() => Math.max(1, ...(data.value?.people.map((p) => p.open) ?? [])))
const totals = computed(() => {
  const people = data.value?.people ?? []
  return {
    open: people.reduce((sum, p) => sum + p.open, 0) + (data.value?.unassigned ?? 0),
    overdue: people.reduce((sum, p) => sum + p.overdue, 0),
    minutes: people.reduce((sum, p) => sum + p.minutes_week, 0),
  }
})
</script>

<template>
  <section class="grid gap-5" aria-label="Carga de trabalho">
    <p class="max-w-2xl text-13 text-fg-muted">
      Tarefas abertas por pessoa, o que vence nos próximos 7 dias e as horas lançadas na última
      semana. Clique numa pessoa para ver as tarefas dela no quadro.
    </p>

    <div v-if="loading" class="grid gap-2">
      <UiSkeleton v-for="n in 4" :key="n" class="h-14 rounded-card" />
    </div>

    <UiEmptyState
      v-else-if="!data?.people.length"
      :icon="Gauge"
      title="Ninguém com tarefas abertas"
      :description="
        data?.unassigned
          ? `${data.unassigned} tarefas abertas estão sem responsável.`
          : 'Quando houver tarefas com responsável, a carga de cada pessoa aparece aqui.'
      "
    />

    <template v-else-if="data">
      <dl class="wl-stats">
        <div>
          <dt>Abertas</dt>
          <dd>{{ totals.open }}</dd>
        </div>
        <div>
          <dt>Atrasadas</dt>
          <dd :class="totals.overdue ? 'text-danger' : ''">{{ totals.overdue }}</dd>
        </div>
        <div>
          <dt>Sem responsável</dt>
          <dd>{{ data.unassigned }}</dd>
        </div>
        <div>
          <dt>Horas na semana</dt>
          <dd>{{ formatMinutes(totals.minutes) }}</dd>
        </div>
      </dl>

      <div class="overflow-x-auto">
        <table class="wl-table">
          <thead>
            <tr>
              <th scope="col">Pessoa</th>
              <th scope="col" class="w-[38%]">Abertas</th>
              <th scope="col" class="text-right">Atrasadas</th>
              <th scope="col" class="text-right">Vencem em 7 dias</th>
              <th scope="col" class="text-right">Pontos</th>
              <th scope="col" class="text-right">Horas (7 dias)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="person in data.people" :key="person.user_id">
              <th scope="row">
                <button
                  type="button"
                  class="wl-person"
                  :title="`Ver as tarefas de ${person.name}`"
                  @click="emit('show', person.user_id)"
                >
                  <UiAvatar :name="person.name" size="xs" />
                  <span class="truncate">{{ person.name }}</span>
                </button>
              </th>
              <td>
                <span class="flex items-center gap-3">
                  <span
                    class="uo-meter flex-1"
                    role="img"
                    :aria-label="`${person.open} tarefas abertas`"
                  >
                    <span :style="{ width: `${(person.open * 100) / most}%` }" />
                  </span>
                  <span class="w-6 shrink-0 text-right font-mono text-fg">{{ person.open }}</span>
                </span>
              </td>
              <td class="text-right font-mono" :class="person.overdue ? 'text-danger' : ''">
                {{ person.overdue }}
              </td>
              <td class="text-right font-mono">{{ person.due_week }}</td>
              <td class="text-right font-mono">{{ person.points || '–' }}</td>
              <td class="text-right font-mono">
                {{ person.minutes_week ? formatMinutes(person.minutes_week) : '–' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<style>
.wl-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (width >= 48rem) {
  .wl-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.wl-stats > div {
  border: 1px solid var(--ds-border);
  border-radius: var(--radius-card);
  background: var(--ds-surface-1);
  padding: 12px 14px;
}

.wl-stats dt {
  font-size: var(--text-12);
  color: var(--ds-fg-muted);
}

.wl-stats dd {
  margin-top: 2px;
  font-family: var(--font-mono);
  font-size: var(--text-20, 1.25rem);
  color: var(--ds-fg);
}

.wl-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: var(--text-13);
  color: var(--ds-fg-muted);
}

.wl-table th,
.wl-table td {
  border-bottom: 1px solid var(--ds-border);
  padding: 10px 12px;
  text-align: left;
  font-weight: 400;
}

.wl-table thead th {
  font-size: var(--text-12);
  font-weight: 500;
}

.wl-table .text-right {
  text-align: right;
}

.wl-person {
  display: flex;
  max-width: 220px;
  cursor: pointer;
  align-items: center;
  gap: 8px;
  border-radius: 6px;
  color: var(--ds-fg);
}

.wl-person:hover {
  text-decoration: underline;
}

.wl-person:focus-visible {
  outline: 2px solid var(--ds-accent);
  outline-offset: 2px;
}
</style>

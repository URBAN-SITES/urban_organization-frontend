<script setup lang="ts">
import type { PreferenceSettings, SelectOption } from '../types'
import ConfigCard from './configCard.vue'
import ConfigField from './configField.vue'
import ConfigToggle from './configToggle.vue'

const settings = defineModel<PreferenceSettings>({ required: true })

const DATE_FORMATS: SelectOption[] = [
  { value: 'dd/mm/yyyy', label: '23/10/2026' },
  { value: 'yyyy-mm-dd', label: '2026-10-23' },
  { value: 'long', label: '23 de out. de 2026' },
]

const WEEK_STARTS: SelectOption[] = [
  { value: 'sunday', label: 'Domingo' },
  { value: 'monday', label: 'Segunda-feira' },
]
</script>

<template>
  <div class="grid items-start gap-[16px] xl:grid-cols-2">
    <ConfigCard title="Datas">
      <div class="flex flex-col gap-[16px] sm:flex-row">
        <ConfigField
          id="preferences-date-format"
          v-model="settings.date_format"
          as="select"
          label="Formato de data"
          :options="DATE_FORMATS"
        />
        <ConfigField
          id="preferences-week-start"
          v-model="settings.week_start"
          as="select"
          label="Semana começa em"
          :options="WEEK_STARTS"
        />
      </div>
    </ConfigCard>

    <ConfigCard title="Kanban" class="gap-[6px]!">
      <div>
        <ConfigToggle
          v-model="settings.compact_cards"
          label="Cartões compactos"
          description="Mostra mais tarefas por coluna"
        />
        <ConfigToggle
          v-model="settings.show_completed"
          label="Mostrar tarefas concluídas"
          description="Mantém a coluna de concluídas visível no board"
        />
      </div>
    </ConfigCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { TopbarComp } from '@/shared/components'
import { useOrganizationsStore } from '@/modules/organizations'
import { AssistantPanel } from '../components'

/** Urban AI de todos os projetos; cada projeto tem a sua na barra do projeto. */
const organizations = useOrganizationsStore()

// a organização só dá contexto; a IA funciona e pergunta mesmo sem ela
onMounted(() => {
  if (!organizations.organizations.length) void organizations.load().catch(() => undefined)
})
</script>

<template>
  <div class="flex h-[calc(100dvh-3.75rem)] w-full min-w-0 flex-col bg-bg md:h-dvh">
    <TopbarComp :crumbs="['Assistente IA']" />
    <div class="uo-backdrop flex min-h-0 flex-1 flex-col p-3 sm:p-5 lg:p-6">
      <AssistantPanel :organization-id="organizations.current?.id" />
    </div>
  </div>
</template>

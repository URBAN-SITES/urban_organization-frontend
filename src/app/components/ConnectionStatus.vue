<script setup lang="ts">
import { LoaderCircle, WifiOff } from '@lucide/vue'
import { useOnline } from '@vueuse/core'
import { watch } from 'vue'
import { toast } from 'vue-sonner'
import { UiIcon } from '@/shared/components'
import { serverWaking } from '@/app/plugins/serverWake'

/** Aviso fixo enquanto o navegador está sem rede; ao voltar, um toast confirma. */
const online = useOnline()

watch(online, (now, before) => {
  if (now && before === false) toast.success('Conexão restabelecida.')
})
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-3 z-[210] flex justify-center px-4">
    <Transition name="ui-pop">
      <p
        v-if="!online"
        role="status"
        class="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface-1 px-3 py-1.5 text-13 text-fg shadow-float"
      >
        <UiIcon :icon="WifiOff" :size="14" class="text-warning" />
        Sem conexão. Tentaremos de novo quando a rede voltar.
      </p>
      <p
        v-else-if="serverWaking"
        role="status"
        class="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface-1 px-3 py-1.5 text-13 text-fg shadow-float"
      >
        <UiIcon :icon="LoaderCircle" :size="14" class="animate-spin text-accent" />
        Acordando o servidor. Depois de um tempo sem uso isso leva até um minuto.
      </p>
    </Transition>
  </div>
</template>

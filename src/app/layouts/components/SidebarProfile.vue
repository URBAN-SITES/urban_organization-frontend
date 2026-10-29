<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import { useAuthStore } from '@/modules/auth'
import { UiAvatar, UiIconButton, UiTooltip } from '@/shared/components'
import { useShell } from '@/shared/composables/shell'

/** Pessoa logada e a saída da conta, no pé da navegação. */
const { collapsed = false } = defineProps<{ collapsed?: boolean }>()

const auth = useAuthStore()
const shell = useShell()
</script>

<template>
  <div v-if="auth.user" :class="['flex items-center gap-1', collapsed ? 'flex-col' : '']">
    <UiTooltip
      :text="auth.user.name"
      placement="right"
      :disabled="!collapsed"
      class="flex min-w-0 flex-1"
    >
      <RouterLink
        to="/configuracoes"
        :aria-label="collapsed ? `${auth.user.name}: configurações da conta` : undefined"
        class="group flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-control py-1.5 pr-2 pl-2 transition-[background-color,scale] duration-(--dur-fast) ease-out hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
      >
        <UiAvatar :name="auth.user.name" :src="auth.user.avatar_url" size="sm" />
        <span class="sidebar-label min-w-0 flex-1">
          <span class="block truncate text-13 leading-4 font-medium text-fg">{{
            auth.user.name
          }}</span>
          <span class="block truncate text-12 leading-4 text-fg-muted">{{ auth.user.email }}</span>
        </span>
      </RouterLink>
    </UiTooltip>
    <UiIconButton
      :icon="LogOut"
      :label="auth.isSigningOut ? 'Saindo...' : 'Sair da conta'"
      :loading="auth.isSigningOut"
      @click="shell.signOut()"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Camera,
  Check,
  Download,
  Folder,
  House,
  Image,
  KeyRound,
  Pencil,
  Plus,
  SwitchCamera,
  Upload,
  UserCog,
  Video,
} from '@lucide/vue'
import type { Component } from 'vue'
import UiButton from '../ui/UiButton.vue'

/*
 * Botão legado: mantém a API antiga (rótulo e ícone por nome) e desenha o UiButton do
 * sistema, para as telas antigas ficarem iguais às novas. Código novo usa UiButton direto.
 */

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'success'
  label?: string
  icon?: string
  iconPosition?: 'left' | 'right'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  size?: 'sm' | 'md'
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  label: '',
  icon: '',
  iconPosition: 'right',
  loading: false,
  disabled: false,
  fullWidth: true,
  size: 'md',
  type: 'button',
})

// nomes do Material Symbols ainda usados pelas telas antigas
const ICONS: Record<string, Component> = {
  add: Plus,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  calendar_month: Calendar,
  cameraswitch: SwitchCamera,
  check: Check,
  download: Download,
  edit: Pencil,
  folder: Folder,
  home: House,
  image: Image,
  lock_reset: KeyRound,
  manage_accounts: UserCog,
  photo_camera: Camera,
  upload: Upload,
  videocam: Video,
}

const VARIANTS = {
  primary: 'primary',
  secondary: 'secondary',
  ghost: 'ghost',
  destructive: 'danger',
  success: 'secondary',
} as const
</script>

<template>
  <UiButton
    :type="type"
    :variant="VARIANTS[props.variant]"
    :size="props.size === 'sm' ? 'md' : 'lg'"
    :icon="props.iconPosition === 'left' ? ICONS[props.icon] : undefined"
    :icon-right="props.iconPosition === 'right' ? ICONS[props.icon] : undefined"
    :loading="loading"
    :disabled="disabled"
    :block="fullWidth"
    class="mt-5"
  >
    {{ label }}
    <slot name="after" />
  </UiButton>
</template>

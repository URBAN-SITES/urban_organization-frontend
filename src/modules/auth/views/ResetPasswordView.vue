<script setup lang="ts">
import { Lock } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { UiButton, UiInput } from '@/shared/components'
import { AuthHeading, PasswordStrength } from '../components'
import { useAuthNavigation } from '../composables'
import { confirmPasswordReset } from '../services'
import { useAuthFlowStore, useAuthStore } from '../stores'
import { passwordProblem } from '../utils'

const router = useRouter()
const navigation = useAuthNavigation()
const authFlow = useAuthFlowStore()
const auth = useAuthStore()
const password = ref('')
const confirmation = ref('')
const errors = reactive({ password: '', confirmation: '' })
const formError = ref('')
const isSubmitting = ref(false)

if (!authFlow.email || !authFlow.resetCode) router.replace(navigation.to('ForgotPassword'))

function validate() {
  errors.password = passwordProblem(password.value)
  errors.confirmation = password.value === confirmation.value ? '' : 'As senhas não coincidem.'
  return !errors.password && !errors.confirmation
}

async function handleSubmit() {
  formError.value = ''
  if (!validate()) return
  isSubmitting.value = true
  try {
    await confirmPasswordReset({
      email: authFlow.email,
      code: authFlow.resetCode,
      new_password: password.value,
    })
    authFlow.clear()
    auth.user = null
    auth.sessions = []
    toast.success('Senha redefinida. Entre com a nova senha.')
    await router.push(navigation.to('Login'))
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Não foi possível redefinir a senha.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section>
    <AuthHeading
      title="Defina uma nova senha"
      description="Use pelo menos 9 caracteres, combinando letras, números e símbolos."
    />

    <form class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
      <div class="flex flex-col gap-2">
        <UiInput
          id="reset-password"
          v-model="password"
          label="Nova senha"
          type="password"
          size="lg"
          :icon="Lock"
          :error="errors.password"
          name="new-password"
          autocomplete="new-password"
          placeholder="Nova senha"
        />
        <PasswordStrength :password="password" />
      </div>
      <UiInput
        id="reset-password-confirmation"
        v-model="confirmation"
        label="Confirmar nova senha"
        type="password"
        size="lg"
        :icon="Lock"
        :error="errors.confirmation"
        name="new-password-confirmation"
        autocomplete="new-password"
        placeholder="Repita a senha"
      />

      <p
        v-if="formError"
        role="alert"
        class="rounded-control bg-danger-soft px-3 py-2.5 text-13 text-danger"
      >
        {{ formError }}
      </p>

      <UiButton
        type="submit"
        variant="primary"
        size="xl"
        block
        :loading="isSubmitting"
        class="mt-2"
      >
        Redefinir senha
      </UiButton>
    </form>
  </section>
</template>

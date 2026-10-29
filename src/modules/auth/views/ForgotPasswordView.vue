<script setup lang="ts">
import { ArrowLeft, Mail } from '@lucide/vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { UiButton, UiInput } from '@/shared/components'
import { AuthHeading } from '../components'
import { useAuthNavigation } from '../composables'
import { requestPasswordReset } from '../services'
import { useAuthFlowStore, useAuthStore } from '../stores'
import { emailProblem } from '../utils'

const router = useRouter()
const navigation = useAuthNavigation()
const authFlow = useAuthFlowStore()
const email = ref(useAuthStore().user?.email || authFlow.email)
const emailError = ref('')
const formError = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  formError.value = ''
  emailError.value = emailProblem(email.value)
  if (emailError.value) return
  isSubmitting.value = true
  try {
    const normalizedEmail = email.value.trim()
    await requestPasswordReset({ email: normalizedEmail })
    authFlow.startPasswordReset(normalizedEmail)
    await router.push(navigation.to('ResetCode'))
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Não foi possível enviar o código.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section>
    <AuthHeading
      title="Esqueceu sua senha?"
      description="Informe seu e-mail e enviaremos um código para você criar uma nova senha."
    />

    <form class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
      <UiInput
        id="forgot-email"
        v-model="email"
        label="E-mail"
        type="email"
        size="lg"
        :icon="Mail"
        :error="emailError"
        name="email"
        autocomplete="email"
        placeholder="voce@email.com"
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
        loading-text="Enviando código..."
        class="mt-2"
      >
        Enviar código
      </UiButton>
    </form>

    <RouterLink
      :to="navigation.to('Login')"
      class="mt-8 inline-flex items-center gap-1.5 rounded-[4px] text-14 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
    >
      <ArrowLeft :size="16" aria-hidden="true" />
      Voltar para o login
    </RouterLink>
  </section>
</template>

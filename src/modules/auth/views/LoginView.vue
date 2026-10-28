<script setup lang="ts">
import { ArrowRight, Lock, Mail } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiButton, UiInput } from '@/shared/components'
import { AuthDivider, AuthHeading, GoogleButton } from '../components'
import { useAuthNavigation } from '../composables'
import { useAuthFlowStore, useAuthStore } from '../stores'
import { emailProblem } from '../utils'

const router = useRouter()
const route = useRoute()
const navigation = useAuthNavigation()
const auth = useAuthStore()
const authFlow = useAuthFlowStore()
const hasGoogle = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

// vindo de um convite, o e-mail convidado já vem preenchido
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const password = ref('')
const errors = reactive({ email: '', password: '' })
const formError = ref('')
const isSubmitting = ref(false)
const isGoogleSubmitting = ref(false)

function validate() {
  errors.email = emailProblem(email.value)
  errors.password = password.value ? '' : 'Informe sua senha.'
  return !errors.email && !errors.password
}

async function handleSubmit() {
  formError.value = ''
  if (!validate()) return
  isSubmitting.value = true
  try {
    await auth.signIn({ email: email.value.trim(), password: password.value })
    authFlow.clear()
    await router.push(navigation.afterLogin.value)
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.'
  } finally {
    isSubmitting.value = false
  }
}

async function handleGoogleCredential(credential: string) {
  if (isGoogleSubmitting.value) return
  formError.value = ''
  isGoogleSubmitting.value = true
  try {
    await auth.signInWithGoogle(credential)
    authFlow.clear()
    await router.push(navigation.afterLogin.value)
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Não foi possível entrar com Google.'
  } finally {
    isGoogleSubmitting.value = false
  }
}
</script>

<template>
  <section>
    <AuthHeading
      title="Bem-vindo de volta"
      description="Acesse sua conta e continue construindo com o Inceptum."
    />

    <template v-if="hasGoogle">
      <GoogleButton @credential="handleGoogleCredential" />
      <AuthDivider />
    </template>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
      <UiInput
        id="login-email"
        v-model="email"
        label="E-mail"
        type="email"
        size="lg"
        :icon="Mail"
        :error="errors.email"
        name="email"
        autocomplete="username"
        placeholder="voce@email.com"
        @blur="email && (errors.email = emailProblem(email))"
      />
      <div class="flex flex-col gap-2">
        <UiInput
          id="login-password"
          v-model="password"
          label="Senha"
          type="password"
          size="lg"
          :icon="Lock"
          :error="errors.password"
          name="password"
          autocomplete="current-password"
          placeholder="Sua senha"
        />
        <RouterLink
          :to="navigation.to('ForgotPassword')"
          class="self-end rounded-[4px] text-13 text-fg-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Esqueceu a senha?
        </RouterLink>
      </div>

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
        :icon-right="ArrowRight"
        :loading="isSubmitting"
        :disabled="isGoogleSubmitting"
        class="mt-2"
      >
        Entrar
      </UiButton>
    </form>

    <p class="mt-8 text-center text-14 text-fg-muted">
      Ainda não tem uma conta?
      <RouterLink
        :to="navigation.to('Register')"
        class="font-medium text-fg underline underline-offset-4 hover:text-accent"
      >
        Criar conta
      </RouterLink>
    </p>
  </section>
</template>

<script setup lang="ts">
import { ArrowRight, Lock, Mail, User } from '@lucide/vue'
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GitHubLoginButton } from '@/modules/github'
import { UiButton, UiCheckbox, UiInput } from '@/shared/components'
import {
  AuthAlert,
  AuthDivider,
  AuthHeading,
  GoogleButton,
  PasswordRequirements,
} from '../components'
import { useAuthNavigation } from '../composables'
import { requestRegistrationCode } from '../services'
import { useAuthFlowStore, useAuthStore } from '../stores'
import { emailProblem, passwordProblem } from '../utils'

const router = useRouter()
const route = useRoute()
const navigation = useAuthNavigation()
const auth = useAuthStore()
const authFlow = useAuthFlowStore()
const hasGoogle = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
const hasGitHub = import.meta.env.VITE_GITHUB_LOGIN === 'true'

const name = ref(authFlow.name)
// vindo de um convite, o e-mail convidado já vem preenchido
const email = ref(
  authFlow.email || (typeof route.query.email === 'string' ? route.query.email : ''),
)
// mantém nome e e-mail ao alternar entre cadastro e login (a senha não)
watch(name, (value) => (authFlow.name = value))
watch(email, (value) => (authFlow.email = value))
const password = ref(authFlow.password)
const acceptedTerms = ref(false)
const errors = reactive({ name: '', email: '', password: '', terms: '' })
const formError = ref('')
const isSubmitting = ref(false)
const isGoogleSubmitting = ref(false)

function validate() {
  errors.name = name.value.trim() ? '' : 'Informe seu nome.'
  errors.email = emailProblem(email.value)
  errors.password = passwordProblem(password.value)
  errors.terms = acceptedTerms.value ? '' : 'Aceite os termos para criar a conta.'
  return !errors.name && !errors.email && !errors.password && !errors.terms
}

async function handleSubmit() {
  // Enter repetido no campo não dispara um segundo envio
  if (isSubmitting.value || isGoogleSubmitting.value) return
  formError.value = ''
  if (!validate()) return
  isSubmitting.value = true
  try {
    const normalizedEmail = email.value.trim()
    await requestRegistrationCode({ email: normalizedEmail })
    authFlow.startRegistration({
      email: normalizedEmail,
      name: name.value.trim(),
      password: password.value,
    })
    await router.push(navigation.to('RegisterCode'))
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : 'Não foi possível concluir o cadastro.'
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
    await router.push(navigation.destination.value)
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : 'Não foi possível continuar com Google.'
  } finally {
    isGoogleSubmitting.value = false
  }
}
</script>

<template>
  <section>
    <AuthHeading
      title="Criar sua conta"
      description="Comece a organizar suas ideias e transforme projetos em resultados."
    />

    <template v-if="hasGoogle || hasGitHub">
      <div class="grid gap-2.5">
        <GoogleButton
          v-if="hasGoogle"
          button-text="signup_with"
          @credential="handleGoogleCredential"
        />
        <GitHubLoginButton
          v-if="hasGitHub"
          :return-to="navigation.destination.value"
          @error="formError = $event"
        />
      </div>
      <AuthDivider />
    </template>

    <form class="flex flex-col gap-3.5" novalidate @submit.prevent="handleSubmit">
      <UiInput
        id="register-name"
        v-model="name"
        aria-label="Nome completo"
        size="lg"
        :icon="User"
        :error="errors.name"
        name="name"
        autocomplete="name"
        placeholder="Nome completo"
        maxlength="255"
      />
      <UiInput
        id="register-email"
        v-model="email"
        aria-label="E-mail"
        type="email"
        size="lg"
        :icon="Mail"
        :error="errors.email"
        name="email"
        autocomplete="email"
        placeholder="Seu e-mail"
        @blur="email && (errors.email = emailProblem(email))"
      />
      <UiInput
        id="register-password"
        v-model="password"
        aria-label="Senha"
        type="password"
        size="lg"
        :icon="Lock"
        :error="errors.password"
        name="password"
        autocomplete="new-password"
        placeholder="Crie uma senha"
      />
      <PasswordRequirements :password="password" />

      <div>
        <UiCheckbox id="register-terms" v-model="acceptedTerms">
          <template #label>
            <span class="text-13 text-fg-muted">
              Aceito os
              <RouterLink :to="{ name: 'TermsOfService' }" target="_blank" class="auth-cta ui-link"
                >Termos de uso</RouterLink
              >
              e a
              <RouterLink :to="{ name: 'PrivacyPolicy' }" target="_blank" class="auth-cta ui-link"
                >Política de privacidade</RouterLink
              >
            </span>
          </template>
        </UiCheckbox>
        <p v-if="errors.terms" role="alert" class="mt-1.5 text-12 text-danger">
          {{ errors.terms }}
        </p>
      </div>

      <AuthAlert :message="formError" />

      <UiButton
        type="submit"
        variant="primary"
        size="xl"
        block
        :icon-right="ArrowRight"
        :loading="isSubmitting"
        loading-text="Enviando código..."
        :disabled="isGoogleSubmitting"
        class="mt-1"
      >
        Criar conta
      </UiButton>
    </form>

    <p class="mt-7 text-center text-14 text-fg-muted">
      Já tem uma conta?
      <RouterLink :to="navigation.to('Login')" class="auth-cta ui-link">Entrar</RouterLink>
    </p>
  </section>
</template>

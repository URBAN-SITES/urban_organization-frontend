<script setup lang="ts">
import { ArrowRight, Lock, Mail, User } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GitHubLoginButton } from '@/modules/github'
import { UiButton, UiCheckbox, UiInput } from '@/shared/components'
import { AuthDivider, AuthHeading, GoogleButton, PasswordStrength } from '../components'
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
      title="Crie sua conta"
      description="Organize seus projetos e avance junto com seu time."
    />

    <template v-if="hasGoogle || hasGitHub">
      <div class="grid gap-2">
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

    <form class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
      <UiInput
        id="register-name"
        v-model="name"
        label="Nome completo"
        size="lg"
        :icon="User"
        :error="errors.name"
        name="name"
        autocomplete="name"
        placeholder="Seu nome"
        maxlength="255"
      />
      <UiInput
        id="register-email"
        v-model="email"
        label="E-mail"
        type="email"
        size="lg"
        :icon="Mail"
        :error="errors.email"
        name="email"
        autocomplete="email"
        placeholder="voce@email.com"
        @blur="email && (errors.email = emailProblem(email))"
      />
      <div class="flex flex-col gap-2">
        <UiInput
          id="register-password"
          v-model="password"
          label="Senha"
          type="password"
          size="lg"
          :icon="Lock"
          :error="errors.password"
          hint="Mínimo de 9 caracteres, sem ser só números."
          name="password"
          autocomplete="new-password"
          placeholder="Crie uma senha"
        />
        <PasswordStrength :password="password" />
      </div>

      <div>
        <UiCheckbox id="register-terms" v-model="acceptedTerms">
          <template #label>
            Aceito os
            <RouterLink
              :to="{ name: 'TermsOfService' }"
              target="_blank"
              class="underline underline-offset-4 hover:text-accent"
              >Termos de uso</RouterLink
            >
            e a
            <RouterLink
              :to="{ name: 'PrivacyPolicy' }"
              target="_blank"
              class="underline underline-offset-4 hover:text-accent"
              >Política de privacidade</RouterLink
            >
          </template>
        </UiCheckbox>
        <p v-if="errors.terms" role="alert" class="mt-1.5 text-12 text-danger">
          {{ errors.terms }}
        </p>
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
        Criar conta
      </UiButton>
    </form>

    <p class="mt-8 text-center text-14 text-fg-muted">
      Já tem uma conta?
      <RouterLink
        :to="navigation.to('Login')"
        class="font-medium text-fg underline underline-offset-4 hover:text-accent"
      >
        Entrar
      </RouterLink>
    </p>
  </section>
</template>

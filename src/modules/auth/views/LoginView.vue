<script setup lang="ts">
import { ArrowRight, Lock, Mail } from '@lucide/vue'
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GitHubLoginButton } from '@/modules/github'
import { UiButton, UiCheckbox, UiInput } from '@/shared/components'
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
const hasGitHub = import.meta.env.VITE_GITHUB_LOGIN === 'true'

// vindo de um convite, o e-mail convidado já vem preenchido
const email = ref(typeof route.query.email === 'string' ? route.query.email : authFlow.email)
// mantém o e-mail ao alternar entre login e cadastro
watch(email, (value) => (authFlow.email = value))
const password = ref('')
const remember = ref(true)
const errors = reactive({ email: '', password: '' })
const formError = ref('')
const isSubmitting = ref(false)
const isGoogleSubmitting = ref(false)

function validate() {
  errors.email = emailProblem(email.value)
  errors.password = password.value ? '' : 'Informe sua senha.'
  return !errors.email && !errors.password
}

// sessão criada: a tela da marca cobre o carregamento do app e some quando a rota resolve
async function enterApp() {
  auth.showLoadingScreen('Entrando na sua conta...', 'Preparando seus projetos.')
  try {
    await router.push(navigation.afterLogin.value)
  } finally {
    auth.hideLoadingScreen()
  }
}

async function handleSubmit() {
  // Enter repetido no campo não dispara um segundo envio
  if (isSubmitting.value || isGoogleSubmitting.value) return
  formError.value = ''
  if (!validate()) return
  isSubmitting.value = true
  try {
    await auth.signIn({
      email: email.value.trim(),
      password: password.value,
      remember: remember.value,
    })
    authFlow.clear()
    await enterApp()
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
    await enterApp()
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
      description="Entre na sua conta e continue construindo grandes ideias."
    />

    <template v-if="hasGoogle || hasGitHub">
      <div class="grid gap-2.5">
        <GoogleButton v-if="hasGoogle" @credential="handleGoogleCredential" />
        <GitHubLoginButton
          v-if="hasGitHub"
          label="Entrar com GitHub"
          :return-to="navigation.afterLogin.value"
          @error="formError = $event"
        />
      </div>
      <AuthDivider />
    </template>

    <form class="flex flex-col gap-3.5" novalidate @submit.prevent="handleSubmit">
      <UiInput
        id="login-email"
        v-model="email"
        aria-label="E-mail"
        type="email"
        size="lg"
        :icon="Mail"
        :error="errors.email"
        name="email"
        autocomplete="username"
        placeholder="Seu e-mail"
        @blur="email && (errors.email = emailProblem(email))"
      />
      <UiInput
        id="login-password"
        v-model="password"
        aria-label="Senha"
        type="password"
        size="lg"
        :icon="Lock"
        :error="errors.password"
        name="password"
        autocomplete="current-password"
        placeholder="Sua senha"
      />
      <div class="flex items-center justify-between gap-3">
        <UiCheckbox id="login-remember" v-model="remember">
          <template #label>
            <span class="text-13 text-fg-muted">Lembrar de mim</span>
          </template>
        </UiCheckbox>
        <RouterLink :to="navigation.to('ForgotPassword')" class="auth-cta text-13">
          Esqueceu sua senha?
        </RouterLink>
      </div>

      <Transition name="auth-feedback">
        <p
          v-if="formError"
          role="alert"
          class="auth-error rounded-control border border-danger/30 bg-danger-soft px-3 py-2.5 text-13 text-danger"
        >
          {{ formError }}
        </p>
      </Transition>

      <UiButton
        type="submit"
        variant="primary"
        size="xl"
        block
        :icon-right="ArrowRight"
        :loading="isSubmitting"
        loading-text="Entrando..."
        :disabled="isGoogleSubmitting"
        class="mt-1 h-12"
      >
        Entrar
      </UiButton>
    </form>

    <p class="mt-7 text-center text-14 text-fg-muted">
      Ainda não tem uma conta?
      <RouterLink :to="navigation.to('Register')" class="auth-cta">Criar conta</RouterLink>
    </p>
  </section>
</template>

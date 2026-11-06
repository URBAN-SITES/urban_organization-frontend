<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { UiButton } from '@/shared/components'
import { AuthAlert, AuthBackLink, AuthHeading, CodeInput } from '../components'
import { useAuthNavigation } from '../composables'
import {
  confirmRegistration,
  requestPasswordReset,
  requestRegistrationCode,
  verifyPasswordReset,
} from '../services'
import { useAuthFlowStore, useAuthStore } from '../stores'

const RESEND_SECONDS = 45

const props = defineProps<{ flow: 'register' | 'reset' }>()

const router = useRouter()
const navigation = useAuthNavigation()
const authFlow = useAuthFlowStore()
const auth = useAuthStore()
const code = ref('')
const isSubmitting = ref(false)
const isResending = ref(false)
const errorMessage = ref('')
const secondsLeft = ref(RESEND_SECONDS)
let timer: ReturnType<typeof setInterval> | undefined

const isComplete = computed(() => /^\d{6}$/.test(code.value))
const countdown = computed(() => `0:${String(secondsLeft.value).padStart(2, '0')}`)
const backTo = computed(() =>
  navigation.to(props.flow === 'register' ? 'Register' : 'ForgotPassword'),
)

if (!authFlow.email) router.replace(backTo.value)

function startTimer() {
  secondsLeft.value = RESEND_SECONDS
  clearInterval(timer)
  timer = setInterval(() => {
    secondsLeft.value -= 1
    if (secondsLeft.value <= 0) clearInterval(timer)
  }, 1000)
}

// conta criada: entra com as mesmas credenciais por trás da tela da marca; se a entrada
// automática falhar, a conta continua criada e a pessoa entra pelo formulário
async function enterNewAccount() {
  const credentials = { email: authFlow.email, password: authFlow.password }
  authFlow.clear()
  auth.showLoadingScreen('Criando seu espaço...', 'Sua conta foi criada. Estamos entrando nela.')
  try {
    await auth.signIn(credentials)
    await router.push(navigation.afterLogin.value)
  } catch {
    toast.success('Conta criada. Agora é só entrar.')
    await router.push(navigation.to('Login'))
  } finally {
    auth.hideLoadingScreen()
  }
}

async function handleSubmit() {
  if (!isComplete.value) {
    errorMessage.value = 'Digite os 6 dígitos do código.'
    return
  }
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    if (props.flow === 'register') {
      await confirmRegistration({
        email: authFlow.email,
        code: code.value,
        name: authFlow.name,
        password: authFlow.password,
      })
      await enterNewAccount()
      return
    }
    await verifyPasswordReset({ email: authFlow.email, code: code.value })
    authFlow.resetCode = code.value
    await router.push(navigation.to('ResetPassword'))
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Não foi possível validar o código.'
  } finally {
    isSubmitting.value = false
  }
}

async function resendCode() {
  errorMessage.value = ''
  isResending.value = true
  try {
    const payload = { email: authFlow.email }
    await (props.flow === 'register'
      ? requestRegistrationCode(payload)
      : requestPasswordReset(payload))
    code.value = ''
    toast.success('Enviamos um novo código para o seu e-mail.')
    startTimer()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Não foi possível reenviar o código.'
  } finally {
    isResending.value = false
  }
}

onMounted(startTimer)
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <section>
    <p v-if="props.flow === 'register'" class="mb-3 text-12 font-medium text-fg-muted">
      Etapa 2 de 2
    </p>
    <AuthHeading :title="props.flow === 'register' ? 'Confirme seu e-mail' : 'Digite o código'">
      Enviamos um código de 6 dígitos para
      <span class="font-medium text-fg">{{ authFlow.email }}</span
      >.
    </AuthHeading>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
      <CodeInput v-model="code" :disabled="isSubmitting" :invalid="Boolean(errorMessage)" />

      <AuthAlert :message="errorMessage" />

      <UiButton
        type="submit"
        variant="primary"
        size="xl"
        block
        :loading="isSubmitting"
        :loading-text="props.flow === 'register' ? 'Criando conta...' : 'Verificando...'"
        class="mt-1"
      >
        {{ props.flow === 'register' ? 'Confirmar e criar conta' : 'Verificar código' }}
      </UiButton>
    </form>

    <p class="mt-6 text-center text-14 text-fg-muted" aria-live="polite">
      <template v-if="secondsLeft > 0">
        Reenviar código em <span class="font-mono text-fg">{{ countdown }}</span>
      </template>
      <template v-else>
        Não recebeu?
        <UiButton variant="ghost" size="sm" :loading="isResending" @click="resendCode">
          Reenviar código
        </UiButton>
      </template>
    </p>

    <AuthBackLink :to="backTo" class="mt-8">Corrigir e-mail</AuthBackLink>
  </section>
</template>

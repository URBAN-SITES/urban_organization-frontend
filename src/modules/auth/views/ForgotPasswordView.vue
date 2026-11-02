<script setup lang="ts">
import { ArrowRight, Mail } from '@lucide/vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { UiButton, UiInput } from '@/shared/components'
import { AuthAlert, AuthBackLink, AuthHeading, AuthSentIcon } from '../components'
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
// só vira true depois que o backend aceitou o pedido; falha nunca mostra a confirmação
const sentTo = ref('')

async function handleSubmit() {
  formError.value = ''
  emailError.value = emailProblem(email.value)
  if (emailError.value) return
  isSubmitting.value = true
  try {
    const normalizedEmail = email.value.trim()
    await requestPasswordReset({ email: normalizedEmail })
    authFlow.startPasswordReset(normalizedEmail)
    sentTo.value = normalizedEmail
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Não foi possível enviar o código.'
  } finally {
    isSubmitting.value = false
  }
}

function useAnotherEmail() {
  sentTo.value = ''
}
</script>

<template>
  <section class="auth-forgot grid">
    <Transition name="auth-swap" mode="out-in">
      <div v-if="!sentTo" key="form">
        <AuthHeading
          title="Esqueceu sua senha?"
          description="Sem problemas. Informe o e-mail da sua conta e enviaremos um código para você criar uma nova senha."
        />

        <form class="flex flex-col gap-3.5" novalidate @submit.prevent="handleSubmit">
          <UiInput
            id="forgot-email"
            v-model="email"
            aria-label="E-mail"
            type="email"
            size="lg"
            :icon="Mail"
            :error="emailError"
            name="email"
            autocomplete="email"
            placeholder="Seu e-mail"
            @blur="email && (emailError = emailProblem(email))"
          />

          <AuthAlert :message="formError" />

          <UiButton
            type="submit"
            variant="primary"
            size="xl"
            block
            :icon-right="ArrowRight"
            :loading="isSubmitting"
            loading-text="Enviando..."
            class="mt-1"
          >
            Enviar código
          </UiButton>
        </form>

        <p class="mt-8 text-center">
          <AuthBackLink :to="navigation.to('Login')">Voltar para o login</AuthBackLink>
        </p>
      </div>

      <div v-else key="sent" class="flex flex-col items-center text-center" role="status">
        <AuthSentIcon class="mb-6" />
        <AuthHeading title="E-mail enviado" align="center">
          Se existir uma conta com
          <strong class="font-medium break-all text-fg">{{ sentTo }}</strong
          >, você vai receber um código para criar uma nova senha. Confira também a caixa de spam.
        </AuthHeading>

        <div class="mt-2 grid w-full gap-3">
          <UiButton
            variant="primary"
            size="xl"
            block
            :icon-right="ArrowRight"
            @click="router.push(navigation.to('ResetCode'))"
          >
            Inserir código
          </UiButton>
          <UiButton
            variant="secondary"
            size="xl"
            block
            @click="router.push(navigation.to('Login'))"
          >
            Voltar para o login
          </UiButton>
        </div>

        <button type="button" class="auth-cta mt-6 text-13" @click="useAnotherEmail">
          Usar outro e-mail
        </button>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { ArrowLeft, FileText, Mail, ShieldCheck } from '@lucide/vue'
import { computed } from 'vue'
import { BrandLogo } from '@/shared/components'

/**
 * Termos de Serviço e Política de Privacidade (públicas; exigidas pela tela de consentimento
 * OAuth do Google). O texto descreve só o que o sistema faz de fato: cada provedor citado
 * aparece no código (Google, GitHub, Cloudinary, Mercado Pago, Firebase, Mapbox, LiveKit).
 */
const props = defineProps<{ doc: 'privacidade' | 'termos' }>()

// TODO: confirmar o e-mail de contato e o responsável (nome ou CNPJ) antes de publicar
const CONTACT = 'contato@michalski.app'
const UPDATED = '3 de novembro de 2026'

interface Section {
  id: string
  title: string
  body: string[]
  items?: string[]
}

interface LegalDoc {
  title: string
  intro: string
  summary: string[]
  sections: Section[]
}

const docs: Record<'privacidade' | 'termos', LegalDoc> = {
  privacidade: {
    title: 'Política de Privacidade',
    intro:
      'Esta política explica quais dados pessoais o Urban Organization trata, por que, com quem compartilha e como você exerce seus direitos, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).',
    summary: [
      'Usamos seus dados só para fazer o serviço funcionar. Não vendemos dados e não usamos para publicidade.',
      'O que você cria no app só é visto pelos membros da sua organização e de cada projeto.',
      'Gravações de reunião só acontecem com o consentimento de cada participante e são apagadas automaticamente.',
      'Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento.',
    ],
    sections: [
      {
        id: 'quem-somos',
        title: 'Quem somos',
        body: [
          'O Urban Organization é uma plataforma de organização de projetos, tarefas, equipes, reuniões e calendário. Para esta política, somos o controlador dos dados pessoais tratados no serviço. Fale com o responsável pela proteção de dados pelo contato no fim desta página.',
        ],
      },
      {
        id: 'dados',
        title: 'Dados que coletamos',
        body: ['Tratamos apenas os dados necessários para cada função:'],
        items: [
          'Cadastro: nome, e-mail, senha (guardada só como hash, nunca em texto) e, se você quiser, foto e biografia.',
          'Conteúdo que você cria: organizações, projetos, tarefas, comentários, mensagens, arquivos anexados e convites.',
          'Reuniões: participantes, horários e, quando há gravação, o áudio e o vídeo, a transcrição e o resumo gerados a partir dela.',
          'Cobranças das tarefas: nome e CPF de quem paga pelo Pix e a situação do pagamento.',
          'Integrações que você conectar: identificação da conta Google ou GitHub e as permissões concedidas.',
          'Dados técnicos: endereço IP, navegador, sessões ativas e registro de ações importantes, usados para segurança e auditoria.',
          'Notificações: o identificador do seu aparelho, se você ativar as notificações push.',
        ],
      },
      {
        id: 'finalidades',
        title: 'Para que usamos e com qual base legal',
        body: ['Cada uso tem uma base prevista na LGPD:'],
        items: [
          'Prestar o serviço que você contratou (execução de contrato): conta, organizações, tarefas, chat, calendário e reuniões.',
          'Manter a plataforma segura e prevenir fraudes e acessos indevidos (legítimo interesse).',
          'Gravar reuniões, enviar notificações push, usar sua localização e conectar integrações (consentimento, que você pode retirar quando quiser).',
          'Guardar registros de pagamento e atender pedidos de autoridades (obrigação legal).',
        ],
      },
      {
        id: 'google',
        title: 'Integração com o Google',
        body: [
          'Você pode entrar com sua conta Google. Se conectar o Google ao app, pedimos acesso ao Google Agenda (calendar.events), para criar e atualizar eventos ligados às suas tarefas, e, opcionalmente, ao Google Drive (drive.file), que só permite ver os arquivos criados ou anexados pelo próprio Urban Organization.',
          'O uso e a transferência de informações recebidas das APIs do Google seguem a Política de Dados do Usuário dos Serviços de API do Google, incluindo os requisitos de Uso Limitado. Não vendemos esses dados, não os usamos para publicidade e não os compartilhamos com terceiros, salvo para operar essas funções ou por obrigação legal. Os tokens de acesso ficam criptografados.',
        ],
      },
      {
        id: 'github',
        title: 'Integração com o GitHub',
        body: [
          'Se você entrar com o GitHub ou ligar repositórios a um projeto, lemos as informações necessárias para mostrar branches, pull requests e issues e vinculá-los às tarefas. Os tokens também ficam criptografados, e você pode desconectar a integração a qualquer momento.',
        ],
      },
      {
        id: 'ia',
        title: 'Inteligência artificial',
        body: [
          'Quando você usa o assistente ou pede a análise de um arquivo, o texto da conversa e o arquivo enviado são processados pela API Gemini, do Google, para gerar a resposta, de acordo com os termos do Google. Evite enviar dados sensíveis ao assistente.',
          'A transcrição e o resumo das reuniões gravadas são gerados no nosso próprio servidor, sem enviar o áudio a empresas de inteligência artificial.',
        ],
      },
      {
        id: 'reunioes',
        title: 'Reuniões e gravações',
        body: [
          'As reuniões em vídeo são transmitidas pelo LiveKit. Uma reunião só é gravada depois que cada participante dá o consentimento ao entrar, e o registro desse consentimento fica guardado. As gravações são apagadas automaticamente depois do prazo de retenção, hoje de 90 dias.',
        ],
      },
      {
        id: 'localizacao',
        title: 'Localização',
        body: [
          'O mapa só usa a localização do seu aparelho se você permitir no navegador. Ela é usada no próprio navegador para mostrar sua posição e não é enviada aos nossos servidores. O mapa é carregado do Mapbox.',
        ],
      },
      {
        id: 'compartilhamento',
        title: 'Com quem compartilhamos',
        body: [
          'O conteúdo de uma organização é visível só aos membros dela, conforme o papel de cada um e o acesso a cada projeto. Fora isso, compartilhamos dados apenas com os prestadores que operam partes do serviço, na medida necessária:',
        ],
        items: [
          'Hospedagem e envio de e-mails do serviço.',
          'Cloudinary, para guardar os arquivos anexados.',
          'Mercado Pago, para processar os pagamentos das cobranças das tarefas.',
          'Google (login, Agenda, Drive e Gemini) e GitHub, quando você usa essas funções.',
          'Firebase, para entregar notificações push.',
          'LiveKit, para as chamadas de vídeo, e Mapbox, para o mapa.',
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies e armazenamento no navegador',
        body: [
          'Usamos cookies de sessão para manter você conectado com segurança, protegidos contra leitura por scripts. O navegador também guarda preferências como tema, organização selecionada e configurações de notificação. Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros.',
        ],
      },
      {
        id: 'retencao',
        title: 'Por quanto tempo guardamos',
        body: [
          'Mantemos seus dados enquanto sua conta existir. Gravações de reunião são apagadas após o prazo de retenção. Registros de pagamento podem ser mantidos pelo prazo exigido em lei mesmo após o encerramento da conta. Você pode desconectar o Google a qualquer momento no app ou em myaccount.google.com/permissions.',
        ],
      },
      {
        id: 'seguranca',
        title: 'Segurança',
        body: [
          'Usamos conexão criptografada (HTTPS), senhas com hash, tokens de integração criptografados, controle de acesso por organização e projeto, limite de tentativas de login e registro de ações importantes. Nenhum sistema é totalmente imune a falhas; se ocorrer um incidente relevante, avisaremos os afetados e a ANPD como a lei exige.',
        ],
      },
      {
        id: 'direitos',
        title: 'Seus direitos',
        body: ['Pela LGPD, você pode a qualquer momento:'],
        items: [
          'Confirmar se tratamos seus dados e ter acesso a eles.',
          'Corrigir dados incompletos ou desatualizados.',
          'Pedir a portabilidade ou a exclusão dos dados.',
          'Saber com quem compartilhamos seus dados.',
          'Retirar um consentimento dado.',
          'Reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
        ],
      },
      {
        id: 'alteracoes',
        title: 'Alterações desta política',
        body: [
          'Quando esta política mudar, atualizaremos a data no topo da página e avisaremos pelo próprio serviço quando a mudança for relevante.',
        ],
      },
    ],
  },
  termos: {
    title: 'Termos de Serviço',
    intro:
      'Estes termos regem o uso do Urban Organization. Ao criar uma conta ou usar o serviço, você concorda com eles. Leia também a Política de Privacidade.',
    summary: [
      'O conteúdo que você cria continua sendo seu.',
      'Você responde pela sua conta e pelo que publica nas organizações de que participa.',
      'Para gravar uma reunião, todos os participantes precisam concordar.',
      'O uso é gratuito, incluindo o assistente de IA.',
    ],
    sections: [
      {
        id: 'aceite',
        title: 'Aceite',
        body: [
          'Ao criar uma conta ou usar o Urban Organization, você declara que leu e concorda com estes termos. Se não concordar, não utilize o serviço.',
        ],
      },
      {
        id: 'servico',
        title: 'O serviço',
        body: [
          'O Urban Organization oferece organizações e equipes, projetos com quadro Kanban, lista, tabela e calendário, tarefas com passos e comentários, mensagens, reuniões em vídeo com gravação e resumo, assistente de inteligência artificial e integrações opcionais com Google e GitHub. Funções podem mudar com o tempo.',
        ],
      },
      {
        id: 'conta',
        title: 'Sua conta',
        body: [
          'Você deve informar dados verdadeiros, manter sua senha em sigilo e nos avisar se suspeitar de uso indevido. Você é responsável pela atividade feita com a sua conta.',
        ],
      },
      {
        id: 'organizacoes',
        title: 'Organizações e papéis',
        body: [
          'Quem cria uma organização é o proprietário e define quem participa e com qual papel (administrador, membro ou leitor). O proprietário e os administradores respondem pelos convites que enviam e pelo acesso que concedem aos projetos.',
        ],
      },
      {
        id: 'uso-aceitavel',
        title: 'Uso aceitável',
        body: ['Não é permitido:'],
        items: [
          'Usar o serviço para fins ilícitos ou para assediar, ameaçar ou discriminar pessoas.',
          'Enviar vírus, arquivos maliciosos ou conteúdo que viole direitos de terceiros.',
          'Tentar acessar dados de outras pessoas ou organizações sem autorização.',
          'Sobrecarregar, testar falhas ou contornar limites da plataforma sem autorização.',
        ],
      },
      {
        id: 'conteudo',
        title: 'Seu conteúdo',
        body: [
          'O conteúdo que você cria continua sendo seu. Você nos autoriza a armazená-lo, processá-lo e exibi-lo aos membros autorizados apenas para prestar o serviço. Você garante ter o direito de enviar o que publica.',
        ],
      },
      {
        id: 'reunioes',
        title: 'Reuniões e gravações',
        body: [
          'A gravação de uma reunião depende do consentimento de cada participante, registrado ao entrar na sala. Quem inicia a gravação deve respeitar a legislação aplicável. As gravações são apagadas automaticamente após o prazo de retenção.',
        ],
      },
      {
        id: 'ia',
        title: 'Inteligência artificial',
        body: [
          'Resumos, transcrições e respostas do assistente são gerados automaticamente e podem conter erros. Revise o resultado antes de tomar decisões ou criar tarefas a partir dele.',
        ],
      },
      {
        id: 'integracoes',
        title: 'Serviços de terceiros',
        body: [
          'Integrações com Google, GitHub, Mercado Pago e outros serviços seguem também os termos desses serviços. Não respondemos por indisponibilidades ou mudanças feitas por eles.',
        ],
      },
      {
        id: 'gratuidade',
        title: 'Gratuidade e cobranças',
        body: [
          'O Urban Organization é gratuito, incluindo o assistente de IA. Para manter o serviço estável, o assistente tem um limite de uso por hora para cada conta.',
          'As cobranças que você cria nas tarefas são pagas por Pix e processadas pelo Mercado Pago.',
        ],
      },
      {
        id: 'disponibilidade',
        title: 'Disponibilidade e responsabilidade',
        body: [
          'Trabalhamos para manter o serviço disponível e seguro, mas ele pode passar por manutenções ou falhas. Na extensão permitida em lei, não respondemos por perdas indiretas decorrentes do uso. Nada nestes termos limita direitos garantidos ao consumidor pela lei brasileira.',
        ],
      },
      {
        id: 'encerramento',
        title: 'Encerramento',
        body: [
          'Você pode pedir o encerramento da conta e a exclusão dos dados pelo contato abaixo. Podemos suspender contas que violem estes termos, avisando o motivo sempre que possível.',
        ],
      },
      {
        id: 'alteracoes',
        title: 'Alterações',
        body: [
          'Podemos atualizar estes termos. Mudanças relevantes serão avisadas pelo próprio serviço; continuar usando o serviço depois disso indica concordância.',
        ],
      },
      {
        id: 'lei',
        title: 'Lei aplicável',
        body: [
          'Estes termos seguem a legislação brasileira. Fica eleito o foro do domicílio do consumidor para resolver eventuais conflitos.',
        ],
      },
    ],
  },
}

const current = computed(() => docs[props.doc])
const other = computed(() =>
  props.doc === 'termos'
    ? { name: 'PrivacyPolicy', label: 'Política de Privacidade' }
    : { name: 'TermsOfService', label: 'Termos de Serviço' },
)
</script>

<template>
  <div class="legal dark min-h-dvh bg-black text-fg">
    <header class="legal-stage">
      <img
        class="legal-stage-media"
        src="/images/office-boardroom.webp"
        srcset="/images/office-boardroom-sm.webp 960w, /images/office-boardroom.webp 1920w"
        sizes="100vw"
        alt=""
        decoding="async"
      />
      <div class="legal-container flex flex-col gap-10 pt-6 pb-12 sm:pb-16">
        <div class="flex items-center justify-between gap-4">
          <RouterLink to="/" class="legal-logo" aria-label="Urban Organization, página inicial">
            <BrandLogo on="dark" class="w-28 sm:w-32" />
          </RouterLink>
          <nav class="legal-tabs" aria-label="Documentos legais">
            <RouterLink
              :to="{ name: 'TermsOfService' }"
              :aria-current="doc === 'termos' ? 'page' : undefined"
            >
              Termos
            </RouterLink>
            <RouterLink
              :to="{ name: 'PrivacyPolicy' }"
              :aria-current="doc === 'privacidade' ? 'page' : undefined"
            >
              Privacidade
            </RouterLink>
          </nav>
        </div>

        <div class="ui-rise max-w-2xl">
          <span class="uo-tile" style="--tile: #f99f11" aria-hidden="true">
            <component :is="doc === 'termos' ? FileText : ShieldCheck" :size="22" />
          </span>
          <h1
            class="mt-5 text-32 leading-tight font-semibold tracking-[-0.02em] text-white sm:text-[40px] sm:leading-[48px]"
          >
            {{ current.title }}
          </h1>
          <p class="mt-3 text-14 leading-relaxed text-white/70 sm:text-16">{{ current.intro }}</p>
          <p class="mt-4 text-12 font-medium tracking-[0.08em] text-[#f99f11] uppercase">
            Atualizado em {{ UPDATED }}
          </p>
        </div>
      </div>
    </header>

    <div class="legal-container grid gap-10 pb-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
      <aside class="hidden lg:block">
        <nav class="sticky top-8" aria-label="Nesta página">
          <p class="mb-3 text-12 font-medium tracking-[0.08em] text-fg-muted uppercase">
            Nesta página
          </p>
          <ol class="grid gap-1 border-l border-border">
            <li v-for="section in current.sections" :key="section.id">
              <a :href="`#${section.id}`" class="legal-toc">{{ section.title }}</a>
            </li>
          </ol>
        </nav>
      </aside>

      <main class="min-w-0">
        <section class="uo-card p-5 sm:p-6" aria-labelledby="legal-summary">
          <h2 id="legal-summary" class="text-14 font-semibold text-fg">Em resumo</h2>
          <ul class="mt-3 grid gap-2.5">
            <li
              v-for="line in current.summary"
              :key="line"
              class="flex gap-3 text-14 leading-relaxed text-fg-muted"
            >
              <span class="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {{ line }}
            </li>
          </ul>
        </section>

        <article class="legal-body">
          <section v-for="(section, index) in current.sections" :id="section.id" :key="section.id">
            <h2>
              <span class="legal-num" aria-hidden="true">{{
                String(index + 1).padStart(2, '0')
              }}</span>
              {{ section.title }}
            </h2>
            <p v-for="paragraph in section.body" :key="paragraph">{{ paragraph }}</p>
            <ul v-if="section.items">
              <li v-for="item in section.items" :key="item">{{ item }}</li>
            </ul>
          </section>
        </article>

        <section class="uo-card mt-12 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <span class="uo-tile" style="--tile: #3b82f6" aria-hidden="true">
            <Mail :size="20" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="text-16 font-semibold text-fg">Dúvidas ou pedidos sobre seus dados</h2>
            <p class="mt-1 text-14 text-fg-muted">
              Escreva para
              <a :href="`mailto:${CONTACT}`" class="legal-link ui-link">{{ CONTACT }}</a
              >. Respondemos pedidos de titulares no prazo previsto na LGPD.
            </p>
          </div>
        </section>

        <div class="mt-10 flex flex-wrap items-center justify-between gap-4 text-14">
          <RouterLink to="/" class="legal-back">
            <ArrowLeft :size="16" aria-hidden="true" /> Voltar ao Urban Organization
          </RouterLink>
          <RouterLink :to="{ name: other.name }" class="legal-link ui-link"
            >Ler {{ other.label }}</RouterLink
          >
        </div>
      </main>
    </div>

    <footer class="border-t border-border py-6 text-center text-12 text-fg-muted">
      © 2026 Urban Organization
    </footer>
  </div>
</template>

<style>
.legal {
  scroll-behavior: smooth;
}

.legal-container {
  width: 100%;
  max-width: 1080px;
  margin-inline: auto;
  padding-inline: 16px;
}

@media (width >= 40rem) {
  .legal-container {
    padding-inline: 32px;
  }
}

.legal-stage {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  color: #ffffff;
}

.legal-stage-media {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 45%;
  animation: uo-hero-settle 1.4s var(--ease-out) both;
}

.legal-stage::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  content: '';
  background:
    radial-gradient(50% 90% at 90% 0%, rgb(249 159 17 / 0.16), transparent 60%),
    linear-gradient(90deg, rgb(0 0 0 / 0.9) 0%, rgb(0 0 0 / 0.65) 55%, rgb(0 0 0 / 0.4) 100%),
    linear-gradient(180deg, transparent 45%, #000 100%);
}

.legal-logo {
  border-radius: 6px;
}

.legal-tabs {
  display: inline-flex;
  gap: 4px;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 999px;
  background: rgb(0 0 0 / 0.35);
  padding: 4px;
  backdrop-filter: blur(10px);
}

.legal-tabs a {
  border-radius: 999px;
  padding: 6px 14px;
  font-size: var(--text-13);
  color: rgb(255 255 255 / 0.75);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.legal-tabs a:hover {
  color: #ffffff;
}

.legal-tabs a[aria-current='page'] {
  background: #f99f11;
  font-weight: 500;
  color: #000000;
}

.legal-toc {
  display: block;
  margin-left: -1px;
  border-left: 1px solid transparent;
  padding: 4px 0 4px 14px;
  font-size: var(--text-13);
  color: var(--ds-fg-muted);
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.legal-toc:hover {
  border-color: var(--ds-accent);
  color: var(--ds-fg);
}

.legal-body section {
  scroll-margin-top: 24px;
  padding-top: 40px;
}

.legal-body h2 {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: var(--text-20, 20px);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ds-fg);
}

.legal-num {
  font-family: var(--font-mono);
  font-size: var(--text-13);
  color: var(--ds-accent);
}

.legal-body p,
.legal-body li {
  max-width: 68ch;
  font-size: var(--text-14);
  line-height: 1.75;
  color: var(--ds-fg-muted);
}

.legal-body p {
  margin-top: 12px;
}

.legal-body ul {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.legal-body li {
  position: relative;
  padding-left: 20px;
}

.legal-body li::before {
  position: absolute;
  top: 0.75em;
  left: 4px;
  width: 6px;
  height: 1px;
  content: '';
  background: var(--ds-accent);
}

.legal-link {
  color: var(--ds-accent);
}

.legal-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ds-fg-muted);
  transition: color var(--dur-fast) var(--ease-out);
}

.legal-back:hover {
  color: var(--ds-fg);
}

.legal-back svg {
  transition: transform var(--dur-base) var(--ease-out);
}

.legal-back:hover svg {
  transform: translateX(-3px);
}

@media (prefers-reduced-motion: reduce) {
  .legal {
    scroll-behavior: auto;
  }

  .legal-stage-media {
    animation: none;
  }
}
</style>

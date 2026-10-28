// Parse against a fixed origin so this also works in tests and rejects external destinations.
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\s]/.test(value)) return '/'
  try {
    const url = new URL(value, 'https://app.invalid')
    const path = decodeURIComponent(url.pathname)
    if (url.origin !== 'https://app.invalid' || path.startsWith('//') || /[\\\s]/.test(path)) {
      return '/'
    }
    return url.pathname + url.search + url.hash
  } catch {
    return '/'
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Mensagem de erro do e-mail, ou '' quando está ok. */
export function emailProblem(value: string): string {
  const email = value.trim()
  if (!email) return 'Informe seu e-mail.'
  return EMAIL_PATTERN.test(email) ? '' : 'Digite um e-mail válido, como voce@email.com.'
}

/** Mesmas regras do backend (tamanho mínimo e senha só numérica). '' quando está ok. */
export function passwordProblem(value: string): string {
  if (!value) return 'Crie uma senha.'
  if (value.length < 9) return 'Use pelo menos 9 caracteres.'
  if (/^\d+$/.test(value)) return 'A senha não pode ter só números.'
  return ''
}

/** Força de 0 a 4, só como orientação visual; quem decide é o backend. */
export function passwordStrength(value: string): number {
  if (!value) return 0
  return [
    value.length >= 9,
    /[a-zA-Z]/.test(value) && /\d/.test(value),
    /[^a-zA-Z\d]/.test(value),
    value.length >= 12,
  ].filter(Boolean).length
}

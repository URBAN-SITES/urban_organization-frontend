import type { MessagePayload, Messaging } from 'firebase/messaging'

// Firebase only loads when someone turns push on, keeping it out of the first page load.
let messagingSdk: typeof import('firebase/messaging') | undefined

export async function requestDeviceFcmToken(): Promise<{
  token: string
  messaging: Messaging
}> {
  if (!('Notification' in window)) {
    throw new Error('Este navegador não oferece suporte a notificações.')
  }

  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    throw new Error('Notificações push exigem HTTPS (ou localhost) e suporte a service workers.')
  }

  if (!import.meta.env.VITE_VAPID_KEY) {
    throw new Error('Configure VITE_VAPID_KEY com a chave Web Push do Firebase.')
  }

  const serviceWorkerRegistration = await navigator.serviceWorker.getRegistration()
  if (!serviceWorkerRegistration) {
    throw new Error(
      'O push está disponível na versão instalada/publicada. Use o build com preview para testar localmente.',
    )
  }

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }

  if (permission !== 'granted') {
    throw new Error('A permissão para notificações não foi concedida.')
  }

  const [{ getFirebaseMessaging }, sdk] = await Promise.all([
    import('@/firebase'),
    import('firebase/messaging'),
  ])
  messagingSdk = sdk
  const messaging = await getFirebaseMessaging()
  if (!serviceWorkerRegistration.active) await navigator.serviceWorker.ready
  const token = await sdk.getToken(messaging, {
    vapidKey: import.meta.env.VITE_VAPID_KEY,
    serviceWorkerRegistration,
  })

  if (!token) {
    throw new Error('O Firebase não retornou um token para este dispositivo.')
  }

  return { token, messaging }
}

/** Needs the `messaging` returned by requestDeviceFcmToken, which already loaded the SDK. */
export function listenForForegroundMessages(
  messaging: Messaging,
  onNotification: (payload: MessagePayload) => void,
): () => void {
  if (!messagingSdk) throw new Error('Ative o push antes de ouvir as mensagens.')
  return messagingSdk.onMessage(messaging, onNotification)
}

import { supabase } from '@/lib/supabase/client'

const KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushState = 'unsupported' | 'needs-install' | 'not-configured' | 'denied' | 'off' | 'on'

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function getPushState(): Promise<PushState> {
  if (isIOS && !isStandalone) return 'needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (!KEY) return 'not-configured'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

export async function enablePush(): Promise<void> {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications were blocked. Allow them in your phone settings.')
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(KEY!) }))
  const j = sub.toJSON()
  const { error } = await (supabase as any)
    .from('push_subscriptions')
    .upsert({ endpoint: j.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth }, { onConflict: 'endpoint' })
  if (error) throw error
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await (supabase as any).from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

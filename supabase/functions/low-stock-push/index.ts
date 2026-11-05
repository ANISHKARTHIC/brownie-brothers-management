// Sends a phone push when an ingredient drops to / below its alert level.
// Called by a database trigger on inventory_items (see migration 00003).
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const fmt = (n: number) => String(Math.round(Number(n) * 1000) / 1000)

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { record, old_record } = await req.json()
  if (!record || !old_record) return new Response('ignored')

  const stock = Number(record.current_stock)
  const min = Number(record.min_stock)
  const wasStock = Number(old_record.current_stock)
  const wasMin = Number(old_record.min_stock)

  // Only when it newly crosses the alert level (or newly hits zero)
  const nowLow = stock <= min
  const wasLow = wasStock <= wasMin
  const newlyOut = stock <= 0 && wasStock > 0
  if (!(nowLow && !wasLow) && !newlyOut) return new Response('no alert')

  const payload = JSON.stringify({
    title: stock <= 0 ? `${record.name} is out of stock` : `${record.name} is running low`,
    body: stock <= 0 ? 'Restock before the next batch.' : `${fmt(stock)} ${record.unit} left · alert at ${fmt(min)}`,
    url: '/stock',
    tag: `low-${record.id}`,
  })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth')

  const results = await Promise.allSettled(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      } catch (e) {
        // Subscription expired / unsubscribed: clean it up
        if (e?.statusCode === 404 || e?.statusCode === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
        throw e
      }
    }),
  )
  return new Response(JSON.stringify({ sent: results.filter((r) => r.status === 'fulfilled').length, total: results.length }))
})

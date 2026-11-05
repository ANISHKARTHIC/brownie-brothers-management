import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, PackageX, Wallet, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getPushState, enablePush, disablePush, type PushState } from '@/lib/push'
import { Sheet } from '@/components/ui/Sheet'
import { useStockItems, stockLevel, fmt } from '@/features/stock/api'

export function Notifications() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data: items = [] } = useStockItems()
  const { data: dues } = useQuery({
    queryKey: ['notif-dues'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('customer_outstanding').select('customer_id, amount').eq('is_settled', false)
      const rows = (data || []) as { customer_id: string; amount: number }[]
      return { total: rows.reduce((s, r) => s + Number(r.amount || 0), 0), customers: new Set(rows.map((r) => r.customer_id)).size }
    },
    staleTime: 60_000,
  })

  const low = items.filter((i) => ['out', 'low'].includes(stockLevel(i))).sort((a, b) => Number(a.current_stock) - Number(b.current_stock))
  const hasDues = (dues?.customers ?? 0) > 0
  const count = low.length + (hasDues ? 1 : 0)
  const [push, setPush] = useState<PushState>('off')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) getPushState().then(setPush).catch(() => setPush('unsupported')) }, [open])
  const togglePush = async () => {
    setBusy(true)
    try {
      if (push === 'on') { await disablePush(); toast.success('Phone alerts off') } else { await enablePush(); toast.success('Phone alerts on') }
      setPush(await getPushState())
    } catch (e: any) { toast.error(e?.message || "Couldn't change phone alerts") }
    setBusy(false)
  }
  const pushHint: Partial<Record<PushState, string>> = {
    'needs-install': 'On iPhone, tap Share → Add to Home Screen, then open Brownee from the Home Screen to turn on alerts.',
    unsupported: "This browser can't show phone alerts. Try Chrome on Android or the installed app on iPhone.",
    'not-configured': 'Phone alerts are not set up on this site yet.',
    denied: 'Notifications are blocked. Allow them for Brownee in your phone settings.',
  }
  const go = (path: string) => { setOpen(false); navigate(path) }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={`Notifications${count ? `, ${count} new` : ''}`}
        className="press relative h-11 w-11 rounded-full bg-[#fffdfa]/90 backdrop-blur border border-[#eadfd4] flex items-center justify-center shadow-sm">
        <Bell className="h-5 w-5 text-[#6b4423]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#b4382f] text-white text-[11px] font-bold flex items-center justify-center">{count}</span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Notifications">
        {count === 0 ? (
          <p className="text-center text-sm text-[#84766c] py-8">You're all caught up. Stock levels look good.</p>
        ) : (
          <div className="space-y-2">
            {low.map((i) => {
              const out = Number(i.current_stock) <= 0
              return (
                <button key={i.id} onClick={() => go('/stock')} className="press w-full flex items-center gap-3 p-3 rounded-2xl bg-[#fbeceb] text-left">
                  <PackageX className="h-5 w-5 text-[#b4382f] shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-[#7a2a23] truncate">{i.name} {out ? 'is out of stock' : 'is running low'}</span>
                    <span className="block text-sm text-[#9a4a43]">{fmt(i.current_stock)} {i.unit} left · alert at {fmt(i.min_stock)}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#b4382f]" />
                </button>
              )
            })}
            {hasDues && (
              <button onClick={() => go('/customers')} className="press w-full flex items-center gap-3 p-3 rounded-2xl bg-[#f4e8d8] text-left">
                <Wallet className="h-5 w-5 text-[#8b5a2b] shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-[#3d2b20]">₹{(dues!.total).toLocaleString('en-IN', { maximumFractionDigits: 0 })} pending</span>
                  <span className="block text-sm text-[#84766c]">from {dues!.customers} customer{dues!.customers > 1 ? 's' : ''}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#8b5a2b]" />
              </button>
            )}
          </div>
        )}
        <div className="border-t border-[#f0e7df] pt-4">
          {push === 'on' || push === 'off' ? (
            <button onClick={togglePush} disabled={busy}
              className={`press w-full h-12 rounded-xl font-semibold text-sm ${push === 'on' ? 'bg-[#faf4ee] text-[#6b4423]' : 'bg-[#8b5a2b] text-white'}`}>
              {push === 'on' ? 'Phone alerts are on · Turn off' : 'Turn on phone alerts'}
            </button>
          ) : (
            <p className="text-sm text-[#84766c]">{pushHint[push]}</p>
          )}
        </div>
      </Sheet>
    </>
  )
}

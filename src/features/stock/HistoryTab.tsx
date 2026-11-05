import { format, isToday, isYesterday } from 'date-fns'
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useHistory, fmt, type StockTx } from './api'
import { Spinner, SetupNotice } from './StockTab'

const META: Record<StockTx['transaction_type'], { label: string; icon: React.ElementType; color: string; sign: string }> = {
  IN:         { label: 'Restock',    icon: ArrowDownCircle,   color: 'text-green-600 bg-green-50', sign: '+' },
  OUT:        { label: 'Used',       icon: ArrowUpCircle,     color: 'text-amber-600 bg-amber-50', sign: '−' },
  WASTAGE:    { label: 'Wastage',    icon: Trash2,            color: 'text-red-600 bg-red-50',     sign: '−' },
  ADJUSTMENT: { label: 'Adjusted',   icon: SlidersHorizontal, color: 'text-blue-600 bg-blue-50',   sign: '' },
}

const dayLabel = (d: Date) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, d MMM'))

export function HistoryTab() {
  const { data = [], isLoading, error } = useHistory()
  if (error) return <SetupNotice error={error} />
  if (isLoading) return <Spinner />
  if (!data.length) return <p className="text-center text-sm text-gray-400 py-12">No stock activity yet.</p>

  const groups = data.reduce<Record<string, StockTx[]>>((a, t) => {
    const k = dayLabel(new Date(t.created_at)); (a[k] ||= []).push(t); return a
  }, {})

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([day, txs]) => (
        <div key={day}>
          <p className="text-xs font-bold text-gray-400 mb-2 px-1">{day}</p>
          <div className="bg-white rounded-2xl border border-[#eadfd4] divide-y divide-gray-50 overflow-hidden">
            {txs.map((t) => {
              const m = META[t.transaction_type]
              const q = Number(t.quantity)
              const sign = t.transaction_type === 'ADJUSTMENT' ? (q >= 0 ? '+' : '−') : m.sign
              return (
                <div key={t.id} className="flex items-center gap-3 p-3">
                  <div className={`p-2 rounded-xl ${m.color}`}><m.icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#3f3027] truncate">{t.inventory_items?.name ?? 'Deleted item'}</p>
                    <p className="text-xs text-gray-400 truncate">{t.notes || m.label} · {format(new Date(t.created_at), 'h:mm a')}{t.profiles?.full_name ? ` · ${t.profiles.full_name}` : ''}</p>
                  </div>
                  <p className={`text-sm font-bold ${sign === '+' ? 'text-green-600' : 'text-[#3f3027]'}`}>
                    {sign}{fmt(Math.abs(q))} <span className="text-xs font-medium text-gray-400">{t.inventory_items?.unit}</span>
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

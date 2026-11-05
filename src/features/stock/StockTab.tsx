import { useMemo, useState } from 'react'
import { Search, Plus, Minus, PackagePlus, AlertTriangle, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  type StockItem, type StockLevel, useStockItems, useAdjustStock, useSaveItem, useDeleteItem,
  stockLevel, stockPct, stepFor, fmt,
} from './api'

const LEVEL: Record<StockLevel, { label: string; bar: string; chip: string }> = {
  out:    { label: 'Out',    bar: 'bg-[#b4382f]', chip: 'bg-[#fbeceb] text-[#9a2f27]' },
  low:    { label: 'Low',    bar: 'bg-[#b4382f]', chip: 'bg-[#fbeceb] text-[#9a2f27]' },
  medium: { label: 'Medium', bar: 'bg-[#d9a23a]', chip: 'bg-[#fbf3df] text-[#8a6212]' },
  ok:     { label: 'OK',     bar: 'bg-[#4f7a4a]', chip: 'bg-[#e9f0e4] text-[#3d6139]' },
}

const UNITS = ['kg', 'g', 'L', 'ml', 'pcs']

export function StockTab() {
  const { data: items = [], isLoading, error } = useStockItems()
  const adjust = useAdjustStock({ silent: true })
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'attention'>('all')
  const [sel, setSel] = useState<StockItem | null>(null)
  const [adding, setAdding] = useState(false)

  const attention = items.filter((i) => ['out', 'low'].includes(stockLevel(i)))
  const list = useMemo(
    () => (filter === 'attention' ? attention : items).filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
    [items, attention, filter, q],
  )

  if (error) return <SetupNotice error={error} />

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search ingredients" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={() => setAdding(true)} className="gap-1.5 shrink-0"><Plus className="h-4 w-4" />New</Button>
      </div>

      <div className="flex gap-2">
        {([['all', `All (${items.length})`], ['attention', `Needs restock (${attention.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === k ? 'bg-[#8b5a2b] text-white' : 'bg-white border border-[#eadfd4] text-[#84766c]'}`}>
            {l}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : list.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">
          {items.length === 0 ? 'No ingredients yet — tap New to add one.' : 'Nothing here.'}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((i) => {
            const lv = LEVEL[stockLevel(i)]
            const step = stepFor(i.unit)
            return (
              <div key={i.id} className="bg-white rounded-2xl border border-[#eadfd4] p-4 shadow-sm">
                <button className="w-full text-left" onClick={() => setSel(i)}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#3f3027] truncate">{i.name}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lv.chip}`}>{lv.label}</span>
                  </div>
                  <p className="mt-1 font-display text-3xl font-bold text-[#3d2b20]">
                    {fmt(i.current_stock)}<span className="text-sm font-medium text-gray-400 ml-1">{i.unit}</span>
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${lv.bar}`} style={{ width: `${stockPct(i)}%` }} />
                  </div>
                </button>
                <div className="mt-3 flex items-center gap-2">
                  <button aria-label={`Remove ${step} ${i.unit}`} disabled={Number(i.current_stock) <= 0}
                    onClick={() => adjust.mutate({ id: i.id, delta: -Math.min(step, Number(i.current_stock)), type: 'ADJUSTMENT', notes: 'Quick adjust' })}
                    className="h-11 flex-1 rounded-xl bg-[#faf4ee] text-[#8b5a2b] flex items-center justify-center press disabled:opacity-40">
                    <Minus className="h-4 w-4" /><span className="text-xs font-semibold ml-1">{step}</span>
                  </button>
                  <button aria-label={`Add ${step} ${i.unit}`}
                    onClick={() => adjust.mutate({ id: i.id, delta: step, type: 'ADJUSTMENT', notes: 'Quick adjust' })}
                    className="h-11 flex-1 rounded-xl bg-[#f4e8d8] text-[#8b5a2b] flex items-center justify-center press">
                    <Plus className="h-4 w-4" /><span className="text-xs font-semibold ml-1">{step}</span>
                  </button>
                  <button onClick={() => setSel(i)} aria-label="Restock"
                    className="h-11 px-4 rounded-xl bg-[#8b5a2b] text-white text-sm font-semibold flex items-center gap-1.5 press">
                    <PackagePlus className="h-4 w-4" />Restock
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ItemSheet item={sel} onClose={() => setSel(null)} />
      <NewItemSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}

type Mode = 'add' | 'used' | 'set'
const MODES: { key: Mode; label: string }[] = [
  { key: 'add', label: 'Add' },
  { key: 'used', label: 'Used / wasted' },
  { key: 'set', label: 'Set count' },
]

function ItemSheet({ item, onClose }: { item: StockItem | null; onClose: () => void }) {
  const adjust = useAdjustStock()
  const save = useSaveItem()
  const del = useDeleteItem()
  const [mode, setMode] = useState<Mode>('add')
  const [qty, setQty] = useState('')
  const [min, setMin] = useState('')
  const [more, setMore] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)

  if (item && item.id !== lastId) { setLastId(item.id); setMode('add'); setQty(''); setMin(String(item.min_stock)); setMore(false) }
  if (!item) return null

  const n = parseFloat(qty)
  const valid = n >= 0 && qty !== '' && (mode === 'set' || n > 0)
  const cur = Number(item.current_stock)
  const tooMuch = mode === 'used' && n > cur
  const step = stepFor(item.unit)
  const after = mode === 'add' ? cur + n : mode === 'used' ? cur - n : n
  const label = mode === 'add' ? `Add ${valid ? fmt(n) + ' ' + item.unit : 'stock'}`
    : mode === 'used' ? `Remove ${valid ? fmt(n) + ' ' + item.unit : 'stock'}` : `Set to ${valid ? fmt(n) + ' ' + item.unit : '…'}`

  const submit = () => {
    const base = { id: item.id }
    const opts = { onSuccess: onClose }
    if (mode === 'add') adjust.mutate({ ...base, delta: n, type: 'IN', notes: 'Restock', success: `Added ${fmt(n)} ${item.unit} to ${item.name}` }, opts)
    else if (mode === 'used') adjust.mutate({ ...base, delta: -n, type: 'WASTAGE', notes: 'Used / wasted', success: `Removed ${fmt(n)} ${item.unit} from ${item.name}` }, opts)
    else adjust.mutate({ ...base, delta: n - cur, type: 'ADJUSTMENT', notes: 'Stock count', success: `${item.name} set to ${fmt(n)} ${item.unit}` }, opts)
  }

  return (
    <Sheet open onClose={onClose} title={item.name}>
      <div className="flex items-baseline justify-between -mt-1">
        <p className="text-sm text-[#84766c]">In stock</p>
        <p className="font-display text-2xl font-bold text-[#3d2b20]">{fmt(cur)} <span className="text-sm font-medium text-[#84766c]">{item.unit}</span></p>
      </div>

      <div className="grid grid-cols-3 gap-1 p-1 bg-[#efe6dc] rounded-xl">
        {MODES.map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`h-10 rounded-lg text-[13px] font-semibold transition-all ${mode === m.key ? 'bg-white text-[#6b4423] shadow-sm' : 'text-[#84766c]'}`}>{m.label}</button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-[#e4d8cc] px-4 focus-within:ring-2 focus-within:ring-[#8b5a2b]">
        <input type="number" inputMode="decimal" min="0" step="any" autoFocus value={qty} onChange={(e) => setQty(e.target.value)}
          placeholder="0" aria-label={`Quantity in ${item.unit}`}
          className="no-spin h-16 flex-1 min-w-0 bg-transparent font-display text-3xl font-bold text-[#3d2b20] outline-none" />
        <span className="text-[#84766c] font-medium">{item.unit}</span>
      </div>
      {mode !== 'set' && (
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 5, 10].map((m) => (
            <button key={m} onClick={() => setQty(String(step * m))}
              className="press px-4 h-9 rounded-full bg-[#faf4ee] text-[#8b5a2b] text-sm font-semibold">{fmt(step * m)}</button>
          ))}
        </div>
      )}
      {valid && !tooMuch && <p className="text-sm text-[#84766c]">New total: <b className="text-[#3d2b20]">{fmt(after)} {item.unit}</b></p>}
      {tooMuch && <p className="text-sm text-[#b4382f]">You only have {fmt(cur)} {item.unit}.</p>}

      <Button className="w-full h-12 text-base" disabled={!valid || tooMuch || adjust.isPending} onClick={submit}>{label}</Button>

      <button onClick={() => setMore(!more)} className="w-full text-sm font-semibold text-[#84766c] pt-1">
        {more ? 'Hide settings' : 'Settings'}
      </button>
      {more && (
        <div className="space-y-3 pt-1">
          <div className="flex gap-2 items-end">
            <Input label={`Low-stock alert below (${item.unit})`} type="number" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
            <Button variant="secondary" disabled={min === '' || save.isPending}
              onClick={() => save.mutate({ id: item.id, name: item.name, unit: item.unit, min_stock: Number(min) }, { onSuccess: onClose })}>Save</Button>
          </div>
          <button className="text-sm text-[#b4382f] font-semibold flex items-center gap-1.5"
            onClick={() => { if (confirm(`Delete ${item.name}? Its history and recipe lines are removed too.`)) del.mutate(item.id, { onSuccess: onClose }) }}>
            <Trash2 className="h-4 w-4" />Delete ingredient
          </button>
        </div>
      )}
    </Sheet>
  )
}

function NewItemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const save = useSaveItem()
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [initial, setInitial] = useState('')
  const [min, setMin] = useState('')
  const reset = () => { setName(''); setInitial(''); setMin(''); onClose() }

  return (
    <Sheet open={open} onClose={onClose} title="New ingredient">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Almonds" autoFocus />
      <div className="flex gap-2 flex-wrap">
        {UNITS.map((u) => (
          <button key={u} onClick={() => setUnit(u)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${unit === u ? 'bg-[#8b5a2b] text-white' : 'bg-[#faf4ee] text-[#8b5a2b]'}`}>{u}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label={`Starting qty (${unit})`} type="number" inputMode="decimal" value={initial} onChange={(e) => setInitial(e.target.value)} />
        <Input label="Alert below" type="number" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
      </div>
      <Button className="w-full" disabled={!name.trim() || save.isPending}
        onClick={() => save.mutate({ name: name.trim(), unit, min_stock: Number(min) || 0, initial: Number(initial) || 0 }, { onSuccess: reset })}>
        Add ingredient
      </Button>
    </Sheet>
  )
}

export function Spinner() {
  return <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent" /></div>
}

export function SetupNotice({ error }: { error: any }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900 flex gap-3">
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">Couldn't load stock</p>
        <p className="mt-1">{error?.message}</p>
        <p className="mt-2 text-xs">If tables/functions are missing, run <code>supabase/migrations/00002_stock_management.sql</code> in the Supabase SQL editor.</p>
      </div>
    </div>
  )
}

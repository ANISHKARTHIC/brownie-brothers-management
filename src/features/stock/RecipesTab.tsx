import { useState } from 'react'
import { Minus, Plus, Pencil, Undo2, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { type Recipe, analyseRecipe, undoRecipe, useRefresh, useRecipes, useStockItems, useUseRecipe, useSaveRecipe, useDeleteRecipe, fmt } from './api'
import { Spinner, SetupNotice } from './StockTab'

const plural = (w: string) => (/(ch|sh|s|x)$/i.test(w) ? w + 'es' : w + 's')

export function RecipesTab() {
  const { data: recipes = [], isLoading, error } = useRecipes()
  const { data: items = [] } = useStockItems()
  const quick = useUseRecipe()
  const refresh = useRefresh()
  const [use, setUse] = useState<Recipe | null>(null)
  const [edit, setEdit] = useState<Recipe | 'new' | null>(null)

  if (error) return <SetupNotice error={error} />
  if (isLoading) return <Spinner />

  // Last "use" per recipe is remembered so a mistaken tap can be reversed any time
  const [last, setLast] = useState<Record<string, { n: number; at: number }>>(() => {
    try { return JSON.parse(localStorage.getItem('stock_last_use') || '{}') } catch { return {} }
  })
  const saveLast = (v: typeof last) => { setLast(v); try { localStorage.setItem('stock_last_use', JSON.stringify(v)) } catch { /* ignore */ } }

  const makeOne = (r: Recipe) =>
    quick.mutate({ id: r.id, batches: 1 }, {
      onSuccess: () => saveLast({ ...last, [r.id]: { n: (last[r.id]?.n ?? 0) + 1, at: Date.now() } }),
    })

  const undo = async (r: Recipe) => {
    const u = last[r.id]
    if (!u) return
    try {
      await undoRecipe(r, 1)
      const n = u.n - 1
      const next = { ...last }
      if (n > 0) next[r.id] = { n, at: u.at }; else delete next[r.id]
      saveLast(next)
      refresh()
      toast.success(`Put back 1 ${r.yield_label} of ingredients`)
    } catch { toast.error("Couldn't undo — try again") }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {recipes.map((r) => {
          const { max, limiting } = analyseRecipe(r, items)
          const unit = r.yield_label
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-[#eadfd4] p-4 shadow-sm">
              <button className="w-full flex items-center gap-3 text-left" onClick={() => setEdit(r)}>
                <span className="text-2xl">{r.emoji}</span>
                <p className="font-semibold text-[#3d2b20] flex-1 min-w-0 truncate">{r.name}</p>
                <Pencil className="h-4 w-4 text-[#c9b8a8]" />
              </button>
              <div className="flex items-end justify-between mt-3">
                <div>
                  <p className={`font-display text-4xl font-bold leading-none ${max === 0 ? 'text-[#b4382f]' : max <= 2 ? 'text-[#b07d12]' : 'text-[#3d2b20]'}`}>{max}</p>
                  <p className="text-sm text-[#84766c] mt-1">{max === 1 ? unit : plural(unit)} possible{max <= 3 && limiting ? ` · low on ${limiting}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={max < 1 || quick.isPending} onClick={() => makeOne(r)}
                    className="press h-12 px-4 rounded-xl bg-[#8b5a2b] text-white font-semibold text-sm flex items-center gap-1.5 disabled:opacity-40">
                    <Minus className="h-4 w-4" />1 {unit}
                  </button>
                  <button disabled={max < 1} onClick={() => setUse(r)} aria-label="Use several"
                    className="press h-12 px-3.5 rounded-xl bg-[#f4e8d8] text-[#8b5a2b] font-semibold text-sm disabled:opacity-40">More</button>
                </div>
              </div>
              {last[r.id] && (
                <button onClick={() => undo(r)}
                  className="press mt-3 w-full h-10 rounded-xl border border-dashed border-[#c9a989] text-[#8b5a2b] text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Undo2 className="h-4 w-4" />Undo last {r.yield_label}{last[r.id].n > 1 ? ` (${last[r.id].n} to undo)` : ''}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <Button variant="outline" className="w-full" onClick={() => setEdit('new')}><Plus className="h-4 w-4 mr-1.5" />Create recipe</Button>

      <UseSheet recipe={use} onUsed={(r, n) => saveLast({ ...last, [r.id]: { n: (last[r.id]?.n ?? 0) + n, at: Date.now() } })} onClose={() => setUse(null)} onEdit={(r) => { setUse(null); setEdit(r) }} />
      <EditSheet recipe={edit} onClose={() => setEdit(null)} />
    </div>
  )
}

function UseSheet({ recipe, onClose, onEdit, onUsed }: { recipe: Recipe | null; onClose: () => void; onEdit: (r: Recipe) => void; onUsed: (r: Recipe, n: number) => void }) {
  const { data: items = [] } = useStockItems()
  const use = useUseRecipe()
  const [n, setN] = useState(1)
  const [lastId, setLastId] = useState<string | null>(null)
  if (recipe && recipe.id !== lastId) { setLastId(recipe.id); setN(1) }
  if (!recipe) return null

  const lines = recipe.stock_recipe_items.map((l) => {
    const it = items.find((i) => i.id === l.inventory_item_id)
    const need = Number(l.quantity) * n
    return { id: l.id, name: it?.name ?? '?', unit: it?.unit ?? '', need, have: Number(it?.current_stock ?? 0), ok: !!it && Number(it.current_stock) >= need }
  })
  const allOk = lines.length > 0 && lines.every((l) => l.ok)

  return (
    <Sheet open onClose={onClose} title={`${recipe.emoji} ${recipe.name}`}>
      <div className="flex items-center justify-center gap-5">
        <button aria-label="Fewer" disabled={n <= 1} onClick={() => setN(n - 1)} className="h-12 w-12 rounded-full bg-[#faf4ee] text-[#8b5a2b] flex items-center justify-center disabled:opacity-40 active:scale-95"><Minus /></button>
        <div className="text-center min-w-[80px]"><p className="font-display text-5xl font-bold text-[#3d2b20]">{n}</p><p className="text-xs text-gray-400">{recipe.yield_label}{n > 1 ? 's' : ''}</p></div>
        <button aria-label="More" onClick={() => setN(n + 1)} className="h-12 w-12 rounded-full bg-[#f4e8d8] text-[#8b5a2b] flex items-center justify-center active:scale-95"><Plus /></button>
      </div>

      <div className="rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {lines.map((l) => (
          <div key={l.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
            <span className={l.ok ? 'text-[#3f3027]' : 'text-red-600 font-semibold'}>{l.name}</span>
            <span className={l.ok ? 'text-gray-500' : 'text-red-600 font-semibold'}>
              {fmt(l.need)} {l.unit} <span className="text-xs text-gray-400">/ {fmt(l.have)}</span>
            </span>
          </div>
        ))}
        {lines.length === 0 && <p className="p-3 text-sm text-gray-400">No ingredients — edit the recipe.</p>}
      </div>

      {!allOk && lines.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-red-600"><AlertTriangle className="h-4 w-4" />Not enough stock for this amount — restock first.</p>
      )}
      <Button className="w-full gap-2" disabled={!allOk || use.isPending}
        onClick={() => use.mutate({ id: recipe.id, batches: n }, { onSuccess: () => { onUsed(recipe, n); onClose() } })}>
        <CheckCircle2 className="h-4 w-4" />Use recipe · deduct stock
      </Button>
      <button onClick={() => onEdit(recipe)} className="w-full text-xs font-semibold text-[#8b5a2b] flex items-center justify-center gap-1"><Pencil className="h-3.5 w-3.5" />Edit recipe</button>
    </Sheet>
  )
}

type Line = { inventory_item_id: string; quantity: string }

function EditSheet({ recipe, onClose }: { recipe: Recipe | 'new' | null; onClose: () => void }) {
  const { data: items = [] } = useStockItems()
  const save = useSaveRecipe()
  const del = useDeleteRecipe()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🍫')
  const [yl, setYl] = useState('batch')
  const [lines, setLines] = useState<Line[]>([])
  const [key, setKey] = useState<string | null>(null)

  const k = recipe === null ? null : recipe === 'new' ? 'new' : recipe.id
  if (k !== key) {
    setKey(k)
    if (recipe === 'new') { setName(''); setEmoji('🍫'); setYl('batch'); setLines([]) }
    else if (recipe) {
      setName(recipe.name); setEmoji(recipe.emoji); setYl(recipe.yield_label)
      setLines(recipe.stock_recipe_items.map((l) => ({ inventory_item_id: l.inventory_item_id, quantity: String(l.quantity) })))
    }
  }
  if (!recipe) return null

  const upd = (i: number, p: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)))
  const used = new Set(lines.map((l) => l.inventory_item_id))
  const clean = lines.filter((l) => l.inventory_item_id && Number(l.quantity) > 0)

  return (
    <Sheet open onClose={onClose} title={recipe === 'new' ? 'New recipe' : 'Edit recipe'}>
      <div className="flex gap-2">
        <div className="w-20"><Input label="Icon" value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 2))} /></div>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Input label="Makes one…" value={yl} onChange={(e) => setYl(e.target.value)} placeholder="tray / batch / layer" />
      <p className="text-sm font-semibold text-gray-700">Ingredients per {yl || 'batch'}</p>
      {lines.map((l, i) => {
        const it = items.find((x) => x.id === l.inventory_item_id)
        return (
          <div key={i} className="flex gap-2 items-center">
            <select value={l.inventory_item_id} onChange={(e) => upd(i, { inventory_item_id: e.target.value })}
              className="h-11 flex-1 min-w-0 rounded-xl border border-gray-300 bg-white px-2 text-sm">
              <option value="">Select…</option>
              {items.filter((x) => x.id === l.inventory_item_id || !used.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <input type="number" inputMode="decimal" step="any" value={l.quantity} onChange={(e) => upd(i, { quantity: e.target.value })}
              className="h-11 w-20 rounded-xl border border-gray-300 px-2 text-sm" aria-label="Quantity" />
            <span className="text-xs text-gray-400 w-7">{it?.unit}</span>
            <button aria-label="Remove line" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="p-2 text-gray-400"><Trash2 className="h-4 w-4" /></button>
          </div>
        )
      })}
      <Button variant="secondary" className="w-full" onClick={() => setLines([...lines, { inventory_item_id: '', quantity: '' }])}><Plus className="h-4 w-4 mr-1" />Add ingredient</Button>
      <Button className="w-full" disabled={!name.trim() || clean.length === 0 || save.isPending}
        onClick={() => save.mutate({
          id: recipe === 'new' ? undefined : recipe.id, name: name.trim(), emoji: emoji || '🍫', yield_label: yl.trim() || 'batch',
          items: clean.map((l) => ({ inventory_item_id: l.inventory_item_id, quantity: Number(l.quantity) })),
        }, { onSuccess: onClose })}>Save recipe</Button>
      {recipe !== 'new' && (
        <button className="text-xs text-red-600 font-semibold flex items-center gap-1"
          onClick={() => { if (confirm(`Delete recipe "${recipe.name}"?`)) del.mutate(recipe.id, { onSuccess: onClose }) }}>
          <Trash2 className="h-3.5 w-3.5" />Delete recipe
        </button>
      )}
    </Sheet>
  )
}

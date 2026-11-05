import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

// New tables/RPCs aren't in generated types yet.
const db = supabase as any

export type StockItem = {
  id: string
  name: string
  category: string
  unit: string
  current_stock: number
  min_stock: number
  max_stock: number | null
}

export type RecipeItem = { id: string; inventory_item_id: string; quantity: number }
export type Recipe = {
  id: string
  name: string
  emoji: string
  yield_label: string
  stock_recipe_items: RecipeItem[]
}

export type StockTx = {
  id: string
  transaction_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'WASTAGE'
  quantity: number
  notes: string | null
  created_at: string
  inventory_items: { name: string; unit: string } | null
  profiles: { full_name: string } | null
}

export type StockLevel = 'out' | 'low' | 'medium' | 'ok'

export function stockLevel(i: StockItem): StockLevel {
  const s = Number(i.current_stock), m = Number(i.min_stock)
  if (s <= 0) return 'out'
  if (s <= m) return 'low'
  if (s <= m * 1.5) return 'medium'
  return 'ok'
}

export function stockPct(i: StockItem) {
  const cap = Number(i.max_stock) || Number(i.min_stock) * 4 || Number(i.current_stock) || 1
  return Math.max(0, Math.min(100, (Number(i.current_stock) / cap) * 100))
}

export function stepFor(unit: string) {
  const u = unit.toLowerCase()
  if (u === 'g' || u === 'ml') return 100
  if (u === 'kg' || u === 'l') return 0.5
  return 1
}

export const fmt = (n: number) => String(Math.round(Number(n) * 1000) / 1000)

const isMissing = (e: any) => /schema cache|does not exist|Could not find/i.test(e?.message || '')

export function useStockItems() {
  return useQuery({
    queryKey: ['stock-items'],
    queryFn: async () => {
      const { data, error } = await db.from('inventory_items').select('*').order('name')
      if (error) throw error
      return data as StockItem[]
    },
  })
}

export function useRecipes() {
  return useQuery({
    queryKey: ['stock-recipes'],
    queryFn: async () => {
      const { data, error } = await db
        .from('stock_recipes')
        .select('*, stock_recipe_items(id, inventory_item_id, quantity)')
        .order('created_at')
      if (error) throw error
      return data as Recipe[]
    },
  })
}

export function useHistory(limit = 100) {
  return useQuery({
    queryKey: ['stock-history', limit],
    queryFn: async () => {
      const { data, error } = await db
        .from('inventory_transactions')
        .select('id, transaction_type, quantity, notes, created_at, inventory_items(name, unit), profiles:created_by(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as StockTx[]
    },
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['stock-items'] })
    qc.invalidateQueries({ queryKey: ['stock-history'] })
  }
}

export function errMsg(e: any) {
  if (isMissing(e)) return 'Stock database not set up — run migration 00002_stock_management.sql'
  return e?.message || 'Something went wrong'
}

export function useAdjustStock(opts: { silent?: boolean } = {}) {
  const invalidate = useInvalidate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; delta: number; type: StockTx['transaction_type']; notes?: string; success?: string }) => {
      const { error } = await db.rpc('adjust_stock', {
        p_item: v.id, p_delta: v.delta, p_type: v.type, p_notes: v.notes ?? null,
      })
      if (error) throw error
      return v
    },
    // Optimistic so +/- taps feel instant
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ['stock-items'] })
      const prev = qc.getQueryData<StockItem[]>(['stock-items'])
      qc.setQueryData<StockItem[]>(['stock-items'], (old) =>
        old?.map((i) => (i.id === v.id ? { ...i, current_stock: Math.max(0, Number(i.current_stock) + v.delta) } : i)))
      return { prev }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['stock-items'], ctx.prev)
      toast.error(errMsg(e))
    },
    onSuccess: (v) => { if (!opts.silent && v.success) toast.success(v.success) },
    onSettled: invalidate,
  })
}

export function useSaveItem() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (v: Partial<StockItem> & { name: string; unit: string; initial?: number }) => {
      const { initial, id, ...rest } = v
      if (id) {
        const { error } = await db.from('inventory_items').update(rest).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await db
          .from('inventory_items')
          .insert({ ...rest, category: 'INGREDIENT', current_stock: 0 })
          .select('id').single()
        if (error) throw error
        if (initial && initial > 0) {
          const r = await db.rpc('adjust_stock', { p_item: data.id, p_delta: initial, p_type: 'IN', p_notes: 'Opening stock' })
          if (r.error) throw r.error
        }
      }
    },
    onSuccess: () => { toast.success('Saved'); invalidate() },
    onError: (e) => toast.error(errMsg(e)),
  })
}

export function useDeleteItem() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('inventory_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Ingredient removed'); invalidate(); },
    onError: (e) => toast.error(errMsg(e)),
  })
}

export function useUseRecipe() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (v: { id: string; batches: number }) => {
      const { error } = await db.rpc('use_recipe', { p_recipe: v.id, p_batches: v.batches })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Ingredients deducted'); invalidate() },
    onError: (e) => toast.error(errMsg(e)),
  })
}

export function useSaveRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id?: string; name: string; emoji: string; yield_label: string; items: { inventory_item_id: string; quantity: number }[] }) => {
      let id = v.id
      const base = { name: v.name, emoji: v.emoji, yield_label: v.yield_label }
      if (id) {
        const { error } = await db.from('stock_recipes').update(base).eq('id', id)
        if (error) throw error
        const d = await db.from('stock_recipe_items').delete().eq('recipe_id', id)
        if (d.error) throw d.error
      } else {
        const { data, error } = await db.from('stock_recipes').insert(base).select('id').single()
        if (error) throw error
        id = data.id
      }
      if (v.items.length) {
        const { error } = await db.from('stock_recipe_items').insert(v.items.map((i) => ({ ...i, recipe_id: id })))
        if (error) throw error
      }
    },
    onSuccess: () => { toast.success('Recipe saved'); qc.invalidateQueries({ queryKey: ['stock-recipes'] }) },
    onError: (e) => toast.error(errMsg(e)),
  })
}

export function useDeleteRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('stock_recipes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Recipe deleted'); qc.invalidateQueries({ queryKey: ['stock-recipes'] }) },
    onError: (e) => toast.error(errMsg(e)),
  })
}

/** How many batches of a recipe current stock allows, and which ingredient limits it. */
export function analyseRecipe(r: Recipe, items: StockItem[]) {
  let max = Infinity
  let limiting: string | null = null
  for (const l of r.stock_recipe_items) {
    const it = items.find((i) => i.id === l.inventory_item_id)
    const can = it ? Math.floor((Number(it.current_stock) + 1e-9) / Number(l.quantity)) : 0
    if (can < max) { max = can; limiting = it?.name ?? 'Missing ingredient' }
  }
  return { max: Number.isFinite(max) ? max : 0, limiting }
}

/** Put a recipe's ingredients back (used by the Undo toast). */
export async function undoRecipe(r: Recipe, batches: number) {
  await Promise.all(
    r.stock_recipe_items.map((l) =>
      db.rpc('adjust_stock', { p_item: l.inventory_item_id, p_delta: Number(l.quantity) * batches, p_type: 'IN', p_notes: `Undo: ${r.name} × ${batches}` }),
    ),
  )
}

export function useRefresh() {
  const invalidate = useInvalidate()
  return invalidate
}

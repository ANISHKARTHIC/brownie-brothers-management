import { useState } from 'react'
import { Boxes, ChefHat, History } from 'lucide-react'
import { StockTab } from './StockTab'
import { RecipesTab } from './RecipesTab'
import { HistoryTab } from './HistoryTab'

const TABS = [
  { key: 'stock', label: 'Stock', icon: Boxes },
  { key: 'recipes', label: 'Recipes', icon: ChefHat },
  { key: 'history', label: 'History', icon: History },
] as const

export function Stock() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>(
    () => (sessionStorage.getItem('stock_tab') as any) || 'stock',
  )
  const pick = (k: typeof tab) => { setTab(k); sessionStorage.setItem('stock_tab', k) }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#3f3027]">Stock</h1>
        <p className="text-sm text-[#84766c]">Ingredients, recipes & usage log</p>
      </header>
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#efe6dc] rounded-2xl">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => pick(t.key)}
            className={`h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              tab === t.key ? 'bg-white text-[#6b4423] shadow-sm' : 'text-[#84766c]'}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>
      {tab === 'stock' && <StockTab />}
      {tab === 'recipes' && <RecipesTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  )
}

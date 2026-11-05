import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Search, Plus, X, ChevronRight, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import type { Database } from '@/types/database.types'

type Customer = Database['public']['Tables']['customers']['Row']

type CustomerWithOutstanding = Customer & {
  outstanding_total: number
}

export function CustomerList() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data: customers = [], isLoading } = useQuery<CustomerWithOutstanding[]>({
    queryKey: ['customers', debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })

      if (debouncedSearch) {
        query = query.ilike('name', `%${debouncedSearch}%`)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching customers:', error)
        return []
      }

      // Fetch active outstanding balances for all customers
      const { data: outstanding, error: outError } = await (supabase as any)
        .from('customer_outstanding')
        .select('customer_id, amount')
        .eq('is_settled', false)

      if (outError) {
        console.error('Error fetching customer outstanding:', outError)
      }

      const totalsMap: Record<string, number> = {}
      if (outstanding) {
        for (const row of outstanding) {
          totalsMap[row.customer_id] = (totalsMap[row.customer_id] || 0) + Number(row.amount || 0)
        }
      }

      return (data || []).map((c: Customer) => ({
        ...c,
        outstanding_total: totalsMap[c.id] || 0,
      }))
    },
  })

  const [onlyDues, setOnlyDues] = useState(false)
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstanding_total || 0), 0)
  const customersWithDues = customers.filter((c) => c.outstanding_total > 0).length
  const rows = (onlyDues ? customers.filter((c) => c.outstanding_total > 0) : customers)
    .slice()
    .sort((a, b) => b.outstanding_total - a.outstanding_total || a.name.localeCompare(b.name))
  const money = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <header className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#3d2b20]">Customers</h1>
          <p className="text-sm text-[#84766c] mt-1">
            {isLoading ? ' ' : <><b className="text-[#b4382f] font-semibold tabular-nums">{money(totalOutstanding)}</b> owed by {customersWithDues} of {customers.length}</>}
          </p>
        </div>
        <button
          onClick={() => navigate('/customers/new')}
          aria-label="Add customer"
          className="press h-12 w-12 shrink-0 rounded-full bg-[#8b5a2b] text-white flex items-center justify-center shadow-[0_6px_14px_rgba(107,68,35,0.25)]"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="sticky top-0 z-10 -mx-4 px-4 md:mx-0 md:px-0 pb-3 pt-1 bg-[#f8f5f1]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a58f7f]" />
          <input
            placeholder="Search customers"
            className="h-12 w-full rounded-2xl bg-white border border-[#eadfd4] pl-11 pr-10 focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          {([[false, 'All'], [true, 'With dues']] as const).map(([v, l]) => (
            <button key={l} onClick={() => setOnlyDues(v)}
              className={`px-4 h-9 rounded-full text-sm font-semibold transition-colors ${onlyDues === v ? 'bg-[#3d2b20] text-white' : 'bg-white border border-[#eadfd4] text-[#84766c]'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-[#84766c]">
          <Users className="h-8 w-8 mx-auto mb-3 text-[#c9a989]" />
          <p className="font-semibold text-[#3d2b20]">{debouncedSearch || onlyDues ? 'No matches' : 'No customers yet'}</p>
          <p className="text-sm mt-1">{debouncedSearch || onlyDues ? 'Try another name or filter.' : 'Tap + to add your first customer.'}</p>
        </div>
      ) : (
        <ul className="bg-white rounded-2xl border border-[#eadfd4] divide-y divide-[#f3ece4] overflow-hidden">
          {rows.map((c) => (
            <li key={c.id}>
              <button onClick={() => navigate(`/customers/${c.id}`)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#fbf8f3] active:bg-[#f4e8d8] transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#3d2b20] truncate">{c.name}</p>
                  {c.phone && <p className="text-sm text-[#a58f7f] mt-0.5">{c.phone}</p>}
                </div>
                {c.outstanding_total > 0 && (
                  <span className="font-semibold text-[#b4382f] tabular-nums">{money(c.outstanding_total)}</span>
                )}
                <ChevronRight className="h-4 w-4 text-[#d6c8bb] shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

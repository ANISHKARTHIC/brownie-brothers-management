import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, Plus, Phone, Users, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
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

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstanding_total || 0), 0)
  const customersWithDues = customers.filter((c) => c.outstanding_total > 0).length

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage customer directory and outstanding balances</p>
        </div>
        <Button
          onClick={() => navigate('/customers/new')}
          className="bg-[#8b5a2b] hover:bg-[#6b4423] text-white rounded-2xl shadow-sm text-xs md:text-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Customer
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Outstanding Summary */}
        <div
          className={`rounded-3xl p-5 border transition-all ${
            totalOutstanding > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                  totalOutstanding > 0 ? 'text-orange-500' : 'text-green-600'
                }`}
              >
                Total Outstanding
              </p>
              <p
                className={`text-3xl font-extrabold tabular-nums ${
                  totalOutstanding > 0 ? 'text-orange-600' : 'text-green-600'
                }`}
              >
                ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`p-2.5 rounded-2xl ${totalOutstanding > 0 ? 'bg-orange-100/70' : 'bg-green-100/70'}`}>
              <AlertCircle className={`h-5 w-5 ${totalOutstanding > 0 ? 'text-orange-600' : 'text-green-600'}`} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 font-medium">
            {customersWithDues > 0
              ? `${customersWithDues} customer${customersWithDues > 1 ? 's' : ''} have unpaid balances`
              : 'All customer payments are up to date'}
          </p>
        </div>

        {/* Directory Count */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              Registered Customers
            </p>
            <p className="text-3xl font-extrabold text-gray-900 tabular-nums">
              {isLoading ? '...' : customers.length}
            </p>
            <p className="text-xs text-gray-500 mt-3 font-medium">
              Tap any customer below to view or edit their profile & dues
            </p>
          </div>
          <div className="p-2.5 bg-[#f4e8d8] rounded-2xl">
            <Users className="h-5 w-5 text-[#8b5a2b]" />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search customer by name..."
          className="pl-11 pr-10 rounded-2xl bg-white border-gray-100 shadow-sm h-12 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
          >
            <span className="text-xs font-bold">✕</span>
          </button>
        )}
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <div className="p-4 bg-[#f4e8d8] rounded-3xl w-fit mx-auto mb-4">
            <Users className="h-10 w-10 text-[#8b5a2b]" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {debouncedSearch ? 'No matching customers' : 'No customers yet'}
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            {debouncedSearch
              ? 'Try searching with another name.'
              : 'Add your first customer to begin tracking their relationship and outstanding dues.'}
          </p>
          {!debouncedSearch && (
            <Button
              onClick={() => navigate('/customers/new')}
              className="bg-[#8b5a2b] hover:bg-[#6b4423] text-white rounded-2xl py-3 px-6 text-sm font-bold active:scale-95 transition-transform"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Customer
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => navigate(`/customers/${customer.id}`)}
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:shadow-md hover:border-gray-200 active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-[#f4e8d8] flex items-center justify-center text-[#8b5a2b] font-bold text-base flex-shrink-0 group-hover:bg-[#ecd2ae] transition-colors">
                  {(customer.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate group-hover:text-[#8b5a2b] transition-colors">
                    {customer.name}
                  </p>
                  {customer.phone && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-400">{customer.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                {customer.outstanding_total > 0 ? (
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-orange-600 tabular-nums">
                      ₹{customer.outstanding_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider">
                      Owed
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-xl text-xs font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Cleared
                  </div>
                )}
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#8b5a2b] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

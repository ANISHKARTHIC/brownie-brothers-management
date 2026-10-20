import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, Plus, Phone, Users, AlertCircle, CheckCircle2 } from 'lucide-react'
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

  const { data: customers, isLoading } = useQuery<CustomerWithOutstanding[]>({
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
      if (error) throw error

      // Fetch outstanding balances for all customers
      const { data: outstanding } = await (supabase as any)
        .from('customer_outstanding')
        .select('customer_id, amount')
        .eq('is_settled', false)

      const totalsMap: Record<string, number> = {}
      if (outstanding) {
        for (const row of outstanding) {
          totalsMap[row.customer_id] = (totalsMap[row.customer_id] || 0) + Number(row.amount)
        }
      }

      return (data || []).map((c: Customer) => ({
        ...c,
        outstanding_total: totalsMap[c.id] || 0,
      }))
    },
  })

  const totalOutstanding = customers?.reduce((sum, c) => sum + c.outstanding_total, 0) || 0

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage clients and outstanding balances</p>
        </div>
        <Button
          onClick={() => navigate('/customers/new')}
          className="bg-[#8b5a2b] hover:bg-[#6b4423] text-white rounded-2xl shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Customer
        </Button>
      </div>

      {/* Summary Card */}
      {!isLoading && customers && customers.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Total Customers</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{customers.length}</p>
          </div>
          <div className={`rounded-2xl border shadow-sm p-4 ${totalOutstanding > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${totalOutstanding > 0 ? 'text-orange-500' : 'text-green-600'}`}>
              Total Outstanding
            </p>
            <p className={`text-3xl font-bold tabular-nums ${totalOutstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search customers..."
          className="pl-11 rounded-2xl bg-white border-gray-100 shadow-sm h-11"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent" />
        </div>
      ) : customers?.length === 0 ? (
        <div className="text-center py-20">
          <div className="p-5 bg-[#f4e8d8] rounded-3xl w-fit mx-auto mb-4">
            <Users className="h-10 w-10 text-[#8b5a2b]" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {debouncedSearch ? 'No results found' : 'No customers yet'}
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            {debouncedSearch ? 'Try a different name.' : 'Add your first customer to get started.'}
          </p>
          {!debouncedSearch && (
            <Button
              onClick={() => navigate('/customers/new')}
              className="bg-[#8b5a2b] text-white rounded-2xl"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Customer
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {customers?.map((customer) => (
            <button
              key={customer.id}
              onClick={() => navigate(`/customers/${customer.id}`)}
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:shadow-md hover:border-gray-200 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-[#f4e8d8] flex items-center justify-center text-[#8b5a2b] font-bold text-lg flex-shrink-0 group-hover:bg-[#edd5b3] transition-colors">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate group-hover:text-[#8b5a2b] transition-colors">
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
              <div className="flex-shrink-0 ml-4 text-right">
                {customer.outstanding_total > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-sm font-bold text-orange-600 tabular-nums">
                        ₹{customer.outstanding_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-orange-400 font-medium">outstanding</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <p className="text-xs font-semibold text-green-600">Cleared</p>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, Plus, Phone, Mail, User, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import type { Database } from '@/types/database.types'

type Customer = Database['public']['Tables']['customers']['Row']

export function CustomerList() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (debouncedSearch) {
        query = query.ilike('name', `%${debouncedSearch}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Customer[]
    }
  })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your client relationships and contact info.</p>
        </div>
        <Button onClick={() => navigate('/customers/new')} className="w-full sm:w-auto bg-[#8b5a2b] hover:bg-[#6b4423] shadow-md transition-all">
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Search customers..." 
              className="pl-10 bg-white border-gray-200 focus:ring-[#8b5a2b]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">
            {!isLoading && <>{customers?.length || 0} Total Customers</>}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent"></div>
          </div>
        ) : customers?.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="bg-[#f4e8d8] h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-[#8b5a2b]" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No customers found</h3>
            <p className="text-gray-500 max-w-sm mx-auto">Build your customer database by adding a new client.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:border-t-0">
            {customers?.map((customer, i) => (
              <div 
                key={customer.id} 
                className={`p-6 hover:bg-gray-50/80 transition-colors cursor-pointer group ${
                  i % 3 !== 2 ? 'md:border-r border-gray-100' : ''
                } ${i >= 3 ? 'md:border-t border-gray-100' : ''}`}
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-[#f4e8d8] transition-colors flex-shrink-0">
                    <User className="h-6 w-6 text-gray-500 group-hover:text-[#8b5a2b]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate group-hover:text-[#8b5a2b] transition-colors">{customer.name}</h3>
                    
                    <div className="space-y-1.5 mt-2">
                      {customer.phone && (
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span className="truncate">{customer.phone}</span>
                        </p>
                      )}
                      {customer.email && (
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span className="truncate">{customer.email}</span>
                        </p>
                      )}
                      {!customer.phone && !customer.email && (
                        <p className="text-sm text-gray-400 italic mt-1">No contact info</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

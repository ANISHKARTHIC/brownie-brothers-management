import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, Plus, Clock, CheckCircle2, PackageOpen } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import { format } from 'date-fns'

export function OrderList() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers ( name ),
          profiles ( full_name )
        `)
        .order('created_at', { ascending: false })

      // Basic local filter emulation for search term
      const { data, error } = await query
      if (error) throw error
      
      let filtered = data as any[]
      if (debouncedSearch) {
        const lower = debouncedSearch.toLowerCase()
        filtered = filtered.filter(o => 
          o.order_number.toString().includes(lower) || 
          (o.customers?.name && o.customers.name.toLowerCase().includes(lower))
        )
      }
      return filtered
    }
  })

  const pendingCount = orders?.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length || 0
  const completedToday = orders?.filter(o => o.status === 'DELIVERED' && new Date(o.created_at).toDateString() === new Date().toDateString()).length || 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage order fulfillment and tracking.</p>
        </div>
        <Button onClick={() => navigate('/orders/new')} className="w-full sm:w-auto bg-[#8b5a2b] hover:bg-[#6b4423] shadow-md transition-all">
          <Plus className="mr-2 h-4 w-4" />
          Create Order
        </Button>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-gray-50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
              <PackageOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{isLoading ? '-' : orders?.length || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-orange-50/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active / Pending</p>
              <p className="text-2xl font-bold text-gray-900">{isLoading ? '-' : pendingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-green-50/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900">{isLoading ? '-' : completedToday}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Search by Order # or Customer Name..." 
              className="pl-10 bg-white border-gray-200 focus:ring-[#8b5a2b]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent"></div>
          </div>
        ) : orders?.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <PackageOpen className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No orders found</h3>
            <p className="text-gray-500 max-w-sm mx-auto">Create a new order to get started processing sales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">Order</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Date</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Payment</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders?.map((order) => (
                  <tr 
                    key={order.id} 
                    className="bg-white hover:bg-gray-50/50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-[#f4e8d8] text-[#8b5a2b] rounded-xl flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                          #{order.order_number.toString().slice(-3)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{(order.customers as any)?.name || 'Walk-in'} <span className="text-xs text-gray-400 font-normal ml-2">Added by {(order.profiles as any)?.full_name || 'Staff'}</span></div>
                          <div className="text-xs text-gray-400 mt-0.5">{order.delivery_type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {format(new Date(order.created_at), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                        order.status === 'READY' || order.status === 'COMPLETED' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                        order.status === 'DELIVERED' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                        order.status === 'CANCELLED' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                        'bg-orange-50 text-orange-700 ring-orange-600/20'
                      }`}>
                        {order.status === 'PENDING' && <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>}
                        {order.status === 'DELIVERED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                        order.payment_status === 'PAID' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'
                      }`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-base font-bold text-gray-900">
                        <span className="text-gray-400 mr-1 text-sm font-normal">₹</span>
                        {order.total}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

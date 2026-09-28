import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, Plus, Clock, CheckCircle2, PackageOpen, Trash2, ChevronRight, XCircle, ChefHat } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export function OrderList() {
  const navigate = useNavigate()
  
  const queryClient = useQueryClient()
  
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Order deleted')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete')
  })

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
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-gray-50">
          <CardContent className="p-2 sm:p-6 flex flex-col md:flex-row items-center gap-1 sm:gap-4 text-center md:text-left">
            <div className="p-2 sm:p-3 bg-blue-100 text-blue-600 rounded-xl">
              <PackageOpen className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm font-medium text-gray-500">Total</p>
              <p className="text-base sm:text-2xl font-bold text-gray-900 leading-none mt-0.5">{isLoading ? '-' : orders?.length || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-orange-50/50">
          <CardContent className="p-2 sm:p-6 flex flex-col md:flex-row items-center gap-1 sm:gap-4 text-center md:text-left">
            <div className="p-2 sm:p-3 bg-orange-100 text-orange-600 rounded-xl">
              <Clock className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm font-medium text-gray-500">Pending</p>
              <p className="text-base sm:text-2xl font-bold text-gray-900 leading-none mt-0.5">{isLoading ? '-' : pendingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-green-50/50">
          <CardContent className="p-2 sm:p-6 flex flex-col md:flex-row items-center gap-1 sm:gap-4 text-center md:text-left">
            <div className="p-2 sm:p-3 bg-green-100 text-green-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm font-medium text-gray-500">Delivered</p>
              <p className="text-base sm:text-2xl font-bold text-gray-900 leading-none mt-0.5">{isLoading ? '-' : completedToday}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white/ rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
          
          <div className="flex flex-col">
            {/* Mobile Cards (Visible only on small screens) */}
            <div className="block md:hidden space-y-3">
              {orders?.map(order => (
                <div 
                  key={order.id} 
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm active:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 bg-[#f4e8d8] text-[#8b5a2b] rounded-xl flex items-center justify-center font-bold text-sm">
                        #{order.order_number.toString().slice(-3)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{order.customers?.name || 'Walk-in Customer'}</p>
                        <p className="text-xs text-gray-500">{format(new Date(order.created_at), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#8b5a2b]">₹{order.total.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <div className="flex gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium ${
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium ${
                        order.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                        order.payment_status === 'PARTIAL' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.payment_status}
                      </span>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        if(confirm('Delete this order permanently?')) {
                          deleteOrderMutation.mutate(order.id)
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (Hidden on small screens) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold">Order</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Date</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Payment</th>
                    <th scope="col" className="px-6 py-4 font-semibold text-right">Total</th>
                    <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {orders?.map((order) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-[#f4e8d8] text-[#8b5a2b] rounded-xl flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            #{order.order_number.toString().slice(-3)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{order.customers?.name || 'Walk-in Customer'}</div>
                            <div className="text-xs text-gray-500">{order.profiles?.full_name ? `by ${order.profiles.full_name}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          order.status === 'COMPLETED' || order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                          order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : 
                           order.status === 'PREPARING' ? <ChefHat className="w-3 h-3 mr-1" /> :
                           order.status === 'CANCELLED' ? <XCircle className="w-3 h-3 mr-1" /> :
                           <Clock className="w-3 h-3 mr-1" />}
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          order.payment_status === 'PAID' ? 'bg-green-100 text-green-700' :
                          order.payment_status === 'PARTIAL' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-[#8b5a2b]">
                        ₹{order.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              if(confirm('Delete this order permanently?')) {
                                deleteOrderMutation.mutate(order.id)
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#8b5a2b] transition-colors" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        )}
      </div>
    </div>
  )
}

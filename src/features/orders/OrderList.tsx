import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, Plus, Filter } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import { format } from 'date-fns'

export function OrderList() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', debouncedSearch, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers ( name, phone )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter)
      }

      if (debouncedSearch) {
        // We can search by order number or customer name. 
        // Supabase allows filtering on joined tables: customers.name.ilike.%search%
        // But for simplicity with TS, we might just fetch and filter client-side if it gets complex,
        // or filter by order number if it's numeric.
        if (!isNaN(Number(debouncedSearch))) {
          query = query.eq('order_number', Number(debouncedSearch))
        }
      }

      const { data, error } = await query
      if (error) throw error
      
      // Client side filter for customer name if search term is text
      let results = data as any[]
      if (debouncedSearch && isNaN(Number(debouncedSearch))) {
        const lowerSearch = debouncedSearch.toLowerCase()
        results = results.filter(order => 
          order.customers?.name?.toLowerCase().includes(lowerSearch)
        )
      }
      
      return results
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY': return 'bg-green-50 text-green-700 ring-green-600/20'
      case 'DELIVERED': return 'bg-blue-50 text-blue-700 ring-blue-600/20'
      case 'CANCELLED': return 'bg-red-50 text-red-700 ring-red-600/20'
      case 'CONFIRMED': return 'bg-purple-50 text-purple-700 ring-purple-600/20'
      default: return 'bg-orange-50 text-orange-700 ring-orange-600/20' // PENDING, PREPARING
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">Manage customer orders and status.</p>
        </div>
        <Button onClick={() => navigate('/orders/new')} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Create Order
        </Button>
      </header>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input 
            placeholder="Search by order # or customer..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select 
            className="h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24 p-6"></CardContent>
            </Card>
          ))}
        </div>
      ) : orders?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders?.map((order) => (
            <Card 
              key={order.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">#{order.order_number}</h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(order.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Customer</span>
                    <span className="text-sm font-medium">{order.customers?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="text-sm font-bold">₹{order.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Payment</span>
                    <span className={`text-xs font-medium ${order.payment_status === 'PAID' ? 'text-green-600' : 'text-orange-600'}`}>
                      {order.payment_status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

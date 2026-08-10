import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/features/auth/AuthContext'
import { startOfDay, endOfDay } from 'date-fns'

export function Dashboard() {
  const { profile } = useAuth()

  // Fetch today's orders
  const { data: todayOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['dashboard_orders'],
    queryFn: async () => {
      const todayStart = startOfDay(new Date()).toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          payment_status,
          created_at,
          customer_id,
          customers ( name )
        `)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as any[]) || []
    }
  })

  // Fetch low stock inventory
  const { data: inventoryAlerts, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['dashboard_inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        // We only want items where current_stock <= min_stock
        .order('current_stock', { ascending: true })

      if (error) throw error
      // Filter manually as Supabase doesn't easily do column-to-column comparison in standard select without RPC
      return ((data as any[]) || []).filter(item => item.current_stock <= item.min_stock)
    }
  })

  // Calculations
  const revenue = todayOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
  const orderCount = todayOrders?.length || 0
  const pendingOrdersCount = todayOrders?.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length || 0
  const pendingPaymentSum = todayOrders?.filter(o => o.payment_status === 'PENDING' || o.payment_status === 'PARTIAL')
                                       .reduce((sum, order) => sum + (order.total || 0), 0) || 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Good morning, {profile?.full_name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-sm text-gray-500">Here's what's happening with your business today.</p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Today's Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingOrders ? '...' : orderCount}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingOrders ? '...' : `₹${revenue.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {isLoadingOrders ? '...' : pendingOrdersCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoadingOrders ? '...' : `₹${pendingPaymentSum.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Orders List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingOrders ? (
                <p className="text-gray-500 text-sm animate-pulse">Loading orders...</p>
              ) : todayOrders?.length === 0 ? (
                <p className="text-gray-500 text-sm">No orders yet today.</p>
              ) : (
                todayOrders?.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">#{order.order_number} - {(order.customers as any)?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">₹{order.total}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        order.status === 'READY' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                        order.status === 'DELIVERED' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                        order.status === 'CANCELLED' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                        'bg-orange-50 text-orange-700 ring-orange-600/20'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingInventory ? (
              <p className="text-gray-500 text-sm animate-pulse">Loading inventory...</p>
            ) : inventoryAlerts?.length === 0 ? (
              <p className="text-gray-500 text-sm">All stock levels are good! 🎉</p>
            ) : (
              <div className="space-y-3">
                {inventoryAlerts?.slice(0, 4).map(item => (
                  <div key={item.id} className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <span className="text-red-400">⚠️</span>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">{item.name}</h3>
                        <div className="mt-1 text-xs text-red-700">
                          <p>Low stock: {item.current_stock} {item.unit} remaining (Min: {item.min_stock})</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

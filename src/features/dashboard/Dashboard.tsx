import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/features/auth/AuthContext'
import { startOfDay, endOfDay } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Hand, AlertTriangle, ArrowRight, Package, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Dashboard() {
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const { profile } = useAuth()
  const navigate = useNavigate()

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
        
      if (error) throw error
      return ((data as any[]) || []).filter(item => item.current_stock <= item.min_stock)
    }
  })

  const orderCount = todayOrders?.length || 0
  const pendingOrdersCount = todayOrders?.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length || 0
  const completedOrdersCount = todayOrders?.filter(o => o.status === 'READY' || o.status === 'DELIVERED').length || 0
  const lowStockCount = inventoryAlerts?.length || 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'there'} <Hand className="inline h-8 w-8 text-yellow-500 ml-2" />
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your business today.</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-gray-50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">Today's Orders</p>
            <div className="text-3xl font-bold text-gray-900">
              {isLoadingOrders ? '...' : orderCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-orange-50/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Package className="w-4 h-4 text-orange-500" /> Pending Prep
            </p>
            <div className="text-3xl font-bold text-orange-600">
              {isLoadingOrders ? '...' : pendingOrdersCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-green-50/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Completed
            </p>
            <div className="text-3xl font-bold text-green-700">
              {isLoadingOrders ? '...' : completedOrdersCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-red-50/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Stock Alerts
            </p>
            <div className="text-3xl font-bold text-red-600">
              {isLoadingInventory ? '...' : lowStockCount}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/orders')} className="text-[#8b5a2b]">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-[#8b5a2b] border-t-transparent rounded-full animate-spin"></div></div>
            ) : todayOrders && todayOrders.length > 0 ? (
              <div className="space-y-4">
                {todayOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-900">Order #{order.order_number}</p>
                      <p className="text-sm text-gray-500">{order.customers?.name || 'Walk-in Customer'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₹{order.total.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        order.status === 'DELIVERED' || order.status === 'READY' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-xl">
                No orders placed today.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Inventory Alerts</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} className="text-[#8b5a2b]">
              Restock <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingInventory ? (
              <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-[#8b5a2b] border-t-transparent rounded-full animate-spin"></div></div>
            ) : inventoryAlerts && inventoryAlerts.length > 0 ? (
              <div className="space-y-4">
                {inventoryAlerts.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100">
                    <div className="p-2 bg-red-100 rounded-lg text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                      <p className="text-xs text-red-600 font-semibold">
                        {item.current_stock} {item.unit} left (Min: {item.min_stock})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                All inventory levels are good!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

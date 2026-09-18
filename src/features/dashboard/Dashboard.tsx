import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/features/auth/AuthContext'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Hand, PartyPopper, AlertTriangle, TrendingUp, IndianRupee } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function Dashboard() {
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

  // Fetch true revenue from payments for today
  const { data: todayPayments } = useQuery({
    queryKey: ['dashboard_payments_today'],
    queryFn: async () => {
      const todayStart = startOfDay(new Date()).toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        
      if (error) throw error
      return data || []
    }
  })

  // Fetch revenue for last 7 days for the chart
  const { data: weeklyRevenue } = useQuery({
    queryKey: ['dashboard_weekly_revenue'],
    queryFn: async () => {
      const sevenDaysAgo = subDays(startOfDay(new Date()), 6).toISOString()
      
      const { data, error } = await supabase
        .from('payments')
        .select('amount, created_at')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // Group by day
      const dailyMap: Record<string, number> = {}
      for(let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i)
        dailyMap[format(d, 'MMM dd')] = 0
      }
      
      data.forEach((p: any) => {
        const dayStr = format(new Date(p.created_at), 'MMM dd')
        if (dailyMap[dayStr] !== undefined) {
          dailyMap[dayStr] += p.amount
        }
      })
      
      return Object.keys(dailyMap).map(day => ({
        day,
        revenue: dailyMap[day]
      }))
    }
  })

  // Fetch low stock inventory
  const { data: inventoryAlerts, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['dashboard_inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('current_stock', { ascending: true })

      if (error) throw error
      return ((data as any[]) || []).filter(item => item.current_stock <= item.min_stock)
    }
  })

  // Calculations
  const revenue = todayPayments?.reduce((sum, p: any) => sum + (p.amount || 0), 0) || 0
  const orderCount = todayOrders?.length || 0
  const pendingOrdersCount = todayOrders?.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length || 0
  const pendingPaymentSum = todayOrders?.filter(o => o.payment_status === 'PENDING' || o.payment_status === 'PARTIAL')
                                       .reduce((sum, order) => sum + (order.total || 0), 0) || 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center">
            Good morning, {profile?.full_name?.split(' ')[0] || 'there'} <Hand className="inline h-8 w-8 text-yellow-500 ml-2" />
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
        
        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-green-50/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              Collected Revenue <TrendingUp className="h-4 w-4 text-green-500" />
            </p>
            <div className="text-3xl font-bold text-green-700">
              {isLoadingOrders ? '...' : `₹${revenue.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-orange-50/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">Pending Orders</p>
            <div className="text-3xl font-bold text-orange-600">
              {isLoadingOrders ? '...' : pendingOrdersCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-red-50/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">Unpaid Dues</p>
            <div className="text-3xl font-bold text-red-600">
              {isLoadingOrders ? '...' : `₹${pendingPaymentSum.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Charts Section */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Revenue Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full mt-4">
            {weeklyRevenue ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5a2b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5a2b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={v => `₹${v}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#8b5a2b', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5a2b" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">Loading chart...</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders List */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isLoadingOrders ? (
                <p className="text-gray-500 text-sm animate-pulse">Loading orders...</p>
              ) : todayOrders?.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                  No orders yet today. Let's make some sales!
                </div>
              ) : (
                todayOrders?.slice(0, 5).map(order => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between hover:bg-gray-50 cursor-pointer rounded-xl p-4 border border-transparent hover:border-gray-100 transition-all"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-[#f4e8d8] text-[#8b5a2b] rounded-full flex items-center justify-center font-bold text-sm">
                        #{order.order_number.toString().slice(-3)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{(order.customers as any)?.name || 'Walk-in Customer'}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" /> {order.total}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                        order.status === 'READY' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                        order.status === 'DELIVERED' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                        order.status === 'CANCELLED' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                        'bg-orange-50 text-orange-700 ring-orange-600/20'
                      }`}>
                        {order.status}
                      </span>
                      {order.payment_status === 'PAID' && <span className="text-[10px] text-green-600 font-medium">PAID</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Inventory Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingInventory ? (
              <p className="text-gray-500 text-sm animate-pulse">Loading inventory...</p>
            ) : inventoryAlerts?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl flex flex-col items-center">
                 <PartyPopper className="h-8 w-8 text-green-400 mb-2" />
                 <p className="font-medium text-gray-900">All Good!</p>
                 <p className="text-xs">No low stock items.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inventoryAlerts?.slice(0, 5).map(item => (
                  <div key={item.id} className="rounded-xl border border-red-100 bg-red-50/50 p-3 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{item.name}</h3>
                      <p className="text-xs text-red-700 mt-1">
                        Only <span className="font-bold">{item.current_stock} {item.unit}</span> left (Min: {item.min_stock})
                      </p>
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

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import { TrendingUp, BarChart3, IndianRupee, AlertCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function Reports() {
  // Fetch true revenue from payments for today
  const { data: todayPayments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['reports_payments_today'],
    queryFn: async () => {
      const todayStart = startOfDay(new Date()).toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        
      if (error) throw error
      return (data as any[]) || []
    }
  })

  // Fetch today's orders for dues
  const { data: todayOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['reports_orders_today'],
    queryFn: async () => {
      const todayStart = startOfDay(new Date()).toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()
      
      const { data, error } = await supabase
        .from('orders')
        .select('total, payment_status')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

      if (error) throw error
      return (data as any[]) || []
    }
  })

  // Fetch revenue for last 7 days for the chart
  const { data: weeklyRevenue } = useQuery({
    queryKey: ['reports_weekly_revenue'],
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

  const revenue = todayPayments?.reduce((sum, p: any) => sum + (p.amount || 0), 0) || 0
  const pendingPaymentSum = todayOrders?.filter(o => o.payment_status === 'PENDING' || o.payment_status === 'PARTIAL')
                                       .reduce((sum, order) => sum + (order.total || 0), 0) || 0

  const isLoading = isLoadingPayments || isLoadingOrders

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center">
            Financial Reports <BarChart3 className="inline h-8 w-8 text-[#8b5a2b] ml-2" />
          </h1>
          <p className="text-gray-500 mt-1">Track your revenue and financial health.</p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-green-50/50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
                  Today's Collected Revenue
                </p>
                <div className="text-4xl font-bold text-green-700 mt-2">
                  {isLoading ? '...' : `₹${revenue.toLocaleString()}`}
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-xl text-green-600">
                <IndianRupee className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-red-50/50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
                  Unpaid Dues (Today)
                </p>
                <div className="text-4xl font-bold text-red-600 mt-2">
                  {isLoading ? '...' : `₹${pendingPaymentSum.toLocaleString()}`}
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-xl text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="shadow-sm border-gray-100">
        <CardHeader className="border-b border-gray-50 pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Revenue Last 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[400px] w-full">
            {weeklyRevenue ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <CartesianGrid vertical={false} stroke="#f3f4f6" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`₹${value}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#22c55e" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent"></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

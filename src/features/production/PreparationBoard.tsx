import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Play, CheckCircle2, Clock, PackageOpen } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import toast from 'react-hot-toast'
import { useEffect, useState, useRef } from 'react'

// A nice pleasant notification ding sound
const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

function OrderTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    const updateTimer = () => {
      const diffInSeconds = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 1000)
      
      if (diffInSeconds < 0) return
      
      const m = Math.floor(diffInSeconds / 60)
      const s = diffInSeconds % 60
      
      setElapsed(`${m}m ${s}s`)
      setIsUrgent(m >= 15) // mark urgent if waiting > 15 mins
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  return (
    <span className={`flex items-center gap-1 ${isUrgent ? 'text-red-600 font-bold animate-pulse' : 'text-gray-500'}`}>
      <Clock className="w-3 h-3" />
      {elapsed}
    </span>
  )
}

export function PreparationBoard() {
  const queryClient = useQueryClient()
  const [previousPendingIds, setPreviousPendingIds] = useState<string[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Initialize audio object once
    audioRef.current = new Audio(NOTIFICATION_SOUND)
  }, [])

  // Fetch pending and preparing orders for TODAY ONLY
  const { data: activeOrders, isLoading } = useQuery({
    queryKey: ['active_prep_orders_today'],
    queryFn: async () => {
      const todayStart = startOfDay(new Date()).toISOString()
      const todayEnd = endOfDay(new Date()).toISOString()

      const { data, error } = await (supabase as any)
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          delivery_type,
          created_at,
          notes,
          customers ( name ),
          order_items (
            id,
            quantity,
            notes,
            product_variants (
              name,
              products ( name )
            )
          )
        `)
        .in('status', ['PENDING', 'PREPARING'])
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as any[]
    },
    refetchInterval: 5000 // Poll every 5 seconds for snappy KDS updates
  })

  // Detect new orders and play sound
  useEffect(() => {
    if (activeOrders) {
      const currentPendingIds = activeOrders.filter(o => o.status === 'PENDING').map(o => o.id)
      
      // If we have previous IDs, and there's a new one that wasn't there before
      if (previousPendingIds.length > 0) {
        const hasNewOrder = currentPendingIds.some(id => !previousPendingIds.includes(id))
        if (hasNewOrder && audioRef.current) {
          audioRef.current.play().catch(e => console.log('Audio play failed (browser policy):', e))
          toast('New Order Arrived!', { icon: '🔔', style: { background: '#8b5a2b', color: '#fff' }})
        }
      }
      
      // Update previous list
      setPreviousPendingIds(currentPendingIds)
    }
  }, [activeOrders])

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      const { error } = await (supabase as any)
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id)
        
      if (error) throw error
      
      // Also log history
      await (supabase as any).from('order_status_history').insert([{
        order_id: id,
        status: newStatus
      }])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active_prep_orders_today'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_orders'] })
      toast.success('Order status updated')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update status')
    }
  })

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent"></div>
      </div>
    )
  }

  const pendingOrders = activeOrders?.filter(o => o.status === 'PENDING') || []
  const preparingOrders = activeOrders?.filter(o => o.status === 'PREPARING') || []

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto h-full flex flex-col">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Preparation</h1>
          <p className="text-gray-500 mt-1 text-sm">Live kitchen display for today's orders.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-orange-200">
            <Clock className="w-4 h-4" />
            {pendingOrders.length} Pending
          </div>
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-blue-200">
            <PackageOpen className="w-4 h-4" />
            {preparingOrders.length} Preparing
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 items-start">
        {/* PENDING COLUMN */}
        <div className="bg-gray-100/50 rounded-2xl p-4 md:p-6 border border-gray-200 h-full">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              To Prepare
            </span>
          </h2>
          
          <div className="space-y-4">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No pending orders right now.
              </div>
            ) : (
              pendingOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onAction={() => updateStatusMutation.mutate({ id: order.id, newStatus: 'PREPARING' })}
                  actionText="Start Prep"
                  actionIcon={<Play className="w-4 h-4 mr-1.5" />}
                  buttonClass="bg-blue-600 hover:bg-blue-700"
                />
              ))
            )}
          </div>
        </div>

        {/* PREPARING COLUMN */}
        <div className="bg-gray-100/50 rounded-2xl p-4 md:p-6 border border-gray-200 h-full">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            Currently Preparing
          </h2>
          
          <div className="space-y-4">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                Kitchen is idle.
              </div>
            ) : (
              preparingOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onAction={() => updateStatusMutation.mutate({ id: order.id, newStatus: 'READY' })}
                  actionText="Mark Ready"
                  actionIcon={<CheckCircle2 className="w-4 h-4 mr-1.5" />}
                  buttonClass="bg-green-600 hover:bg-green-700"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderCard({ order, onAction, actionText, actionIcon, buttonClass }: any) {
  return (
    <Card className="border-l-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 border-l-[#8b5a2b]">
      <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            #{order.order_number.toString().slice(-3)}
            <span className="text-sm font-normal text-gray-500">
              - {order.customers?.name || 'Walk-in'}
            </span>
          </CardTitle>
          <div className="text-xs text-gray-400 mt-1 flex items-center gap-3">
            <span>{format(new Date(order.created_at), 'h:mm a')}</span>
            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-semibold">{order.delivery_type}</span>
            <OrderTimer createdAt={order.created_at} />
          </div>
        </div>
        <Button size="sm" onClick={onAction} className={`${buttonClass} transition-transform active:scale-95`}>
          {actionIcon}
          {actionText}
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        <ul className="space-y-3">
          {order.order_items?.map((item: any) => (
            <li key={item.id} className="flex justify-between items-start text-sm">
              <div>
                <span className="font-bold text-gray-900">{item.quantity}x</span>{' '}
                <span className="text-gray-700">{item.product_variants?.products?.name}</span>
                {item.product_variants?.name !== 'Default' && (
                  <span className="text-gray-500 ml-1">({item.product_variants?.name})</span>
                )}
                {item.notes && (
                  <p className="text-xs text-orange-600 mt-0.5 italic ml-5">Note: {item.notes}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        {order.notes && (
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs bg-yellow-50 p-2 rounded text-yellow-800">
            <strong>Order Notes:</strong> {order.notes}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

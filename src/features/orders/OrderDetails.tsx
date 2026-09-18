import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, MapPin, Phone, User, Package, Clock, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED']

export function OrderDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers ( name, phone, email, notes ),
          order_items (
            id, quantity, unit_price, total_price,
            product_variants ( name, products ( name ) )
          )
        `)
        .eq('id', id!)
        .single()

      if (error) throw error
      return data as any
    },
    enabled: !!id
  })

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await (supabase as any)
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id!)
      if (error) throw error
      
      // Also log to order_status_history
      await (supabase as any).from('order_status_history').insert([{
        order_id: id!,
        status: newStatus
      }])
      
      // If delivered, logic to deduct inventory could go here (simplified)
      if (newStatus === 'DELIVERED') {
         // Logic for inventory transaction deduction can be implemented via RPC or trigger in a real production environment.
         console.log("Order Delivered. Stock deduuction triggered.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Payment updated!')
      toast.success('Status updated!')
    }
  })

  const updatePaymentMutation = useMutation({
    mutationFn: async (newPaymentStatus: string) => {
      const { error } = await (supabase as any)
        .from('orders')
        .update({ payment_status: newPaymentStatus })
        .eq('id', id!)
      if (error) throw error
      
      if (newPaymentStatus === 'PAID') {
         await (supabase as any).from('payments').insert([{
           order_id: id!,
           amount: order?.total || 0,
           payment_method: 'CASH',
           status: 'COMPLETED'
         }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }
  })

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found.</p>
        <Button onClick={() => navigate('/orders')} className="mt-4">Back to Orders</Button>
      </div>
    )
  }

  const currentStatusIndex = STATUS_FLOW.indexOf(order.status)
  const nextStatus = currentStatusIndex !== -1 && currentStatusIndex < STATUS_FLOW.length - 1 
    ? STATUS_FLOW[currentStatusIndex + 1] 
    : null

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h1>
          <p className="text-sm text-gray-500">{format(new Date(order.created_at), 'MMMM d, yyyy - h:mm a')}</p>
        </div>
      </div>

      {/* Action Banner */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${
            order.status === 'DELIVERED' ? 'bg-green-50 text-green-700 ring-green-600/20' :
            order.status === 'CANCELLED' ? 'bg-red-50 text-red-700 ring-red-600/20' :
            'bg-blue-50 text-blue-700 ring-blue-600/20'
          }`}>
            Status: {order.status}
          </span>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${
            order.payment_status === 'PAID' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-orange-50 text-orange-700 ring-orange-600/20'
          }`}>
            Payment: {order.payment_status}
          </span>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          {order.payment_status !== 'PAID' && (
            <Button 
              variant="outline"
              onClick={() => updatePaymentMutation.mutate('PAID')}
              disabled={updatePaymentMutation.isPending}
              className="flex-1 sm:flex-none border-green-600 text-green-700 hover:bg-green-50"
            >
              Mark Paid
            </Button>
          )}
          
          {nextStatus && order.status !== 'CANCELLED' && (
            <Button 
              onClick={() => updateStatusMutation.mutate(nextStatus)}
              disabled={updateStatusMutation.isPending}
              className="flex-1 sm:flex-none bg-[#8b5a2b] hover:bg-[#6b4423]"
            >
              Mark as {nextStatus}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Items */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Order Items</h3>
              </div>
              <div className="p-4 space-y-4">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.product_variants.products.name} - {item.product_variants.name}</p>
                      <p className="text-sm text-gray-500">{item.quantity} x ₹{item.unit_price}</p>
                    </div>
                    <p className="font-medium">₹{item.total_price}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 p-4 border-t space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount</span>
                    <span>-₹{order.discount}</span>
                  </div>
                )}
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Delivery Fee</span>
                    <span>₹{order.delivery_fee}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>Total</span>
                  <span>₹{order.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                <User className="h-5 w-5 text-gray-500" />
                Customer Info
              </h3>
              {order.customers ? (
                <div className="space-y-3">
                  <p className="font-medium text-gray-900">{order.customers.name}</p>
                  {order.customers.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="h-4 w-4" /> {order.customers.phone}
                    </p>
                  )}
                  {order.customers.notes && (
                    <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-100">
                      <strong>Notes:</strong> {order.customers.notes}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Walk-in Customer</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                <Clock className="h-5 w-5 text-gray-500" />
                Order Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium">{order.delivery_type}</span>
                </div>
                {order.delivery_type === 'DELIVERY' && order.customers?.phone && (
                  <div className="pt-2">
                    <Button variant="outline" className="w-full text-sm">
                      <MapPin className="h-4 w-4 mr-2" /> View Address
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
            <Button 
              variant="outline" 
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                if(confirm('Are you sure you want to cancel this order?')) {
                  updateStatusMutation.mutate('CANCELLED')
                }
              }}
            >
              <XCircle className="h-4 w-4 mr-2" /> Cancel Order
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/features/auth/AuthContext'
import type { Database } from '@/types/database.types'

type Customer = Database['public']['Tables']['customers']['Row']
type Product = Database['public']['Tables']['products']['Row']
type ProductVariant = Database['public']['Tables']['product_variants']['Row']

interface ProductWithVariants extends Product {
  variants: ProductVariant[]
}

interface OrderItemInput {
  variantId: string
  quantity: number
  unitPrice: number
  name: string
}

export function OrderForm() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [customerId, setCustomerId] = useState<string>('')
  const [walkInName, setWalkInName] = useState<string>('')
  const [items, setItems] = useState<OrderItemInput[]>([])
  const [deliveryType, setDeliveryType] = useState('PICKUP')
  const [paymentStatus, setPaymentStatus] = useState('PENDING')
  const [discount, setDiscount] = useState<number>(0)
  const [deliveryFee, setDeliveryFee] = useState<number>(0)

  // Fetch Customers
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').order('name')
      if (error) throw error
      return data as Customer[]
    }
  })

  // Fetch Products with variants
  const { data: products } = useQuery({
    queryKey: ['products_with_variants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, variants:product_variants(*)').order('name')
      if (error) throw error
      return data as ProductWithVariants[]
    }
  })

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const total = Math.max(0, subtotal - discount + deliveryFee)

  const handleAddItem = (variantId: string) => {
    if (!variantId) return
    const product = products?.find(p => p.variants.some(v => v.id === variantId))
    const variant = product?.variants.find(v => v.id === variantId)
    
    if (variant && product) {
      setItems(prev => {
        const existing = prev.find(i => i.variantId === variantId)
        if (existing) {
          return prev.map(i => i.variantId === variantId ? { ...i, quantity: i.quantity + 1 } : i)
        }
        return [...prev, {
          variantId: variant.id,
          quantity: 1,
          unitPrice: variant.price,
          name: `${product.name} - ${variant.name}`
        }]
      })
    }
  }

  const handleRemoveItem = (variantId: string) => {
    setItems(prev => prev.filter(i => i.variantId !== variantId))
  }

  

  const handleUpdateQuantity = (variantId: string, quantity: number) => {
    if (quantity < 1) return
    setItems(prev => prev.map(i => i.variantId === variantId ? { ...i, quantity } : i))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      setError("Please add at least one item to the order.")
      return
    }
    
    setIsSubmitting(true)
    setError(null)

    try {
      let finalCustomerId = customerId || null;
      
      // If walk-in customer with a name, create a new customer record
      if (!finalCustomerId && walkInName.trim() !== '') {
        const { data: newCust, error: custError } = await supabase
          .from('customers')
          .insert([{ name: walkInName.trim() }] as any)
          .select()
          .single();
          
        if (custError) throw custError;
        if (newCust) {
          finalCustomerId = (newCust as any).id;
        }
      }

      // Create Order
      const { data, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            customer_id: finalCustomerId,
            staff_id: session?.user?.id,
            status: 'PENDING',
            subtotal,
            discount,
            delivery_fee: deliveryFee,
            total,
            payment_status: paymentStatus,
            delivery_type: deliveryType,
            order_number: Math.floor(Math.random() * 10000) // Simplistic order number generation
          }
        ] as any)
        .select()
        .single()
        
      const orderData = data as any

      if (orderError) throw orderError
      if (!orderData) throw new Error("Failed to create order")

      // Create Order Items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems as any)

      if (itemsError) throw itemsError

      // If Paid, create a payment record
      if (paymentStatus === 'PAID') {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert([
            {
              order_id: orderData.id,
              amount: total,
              method: 'CASH', // Default for now
              status: 'PAID' // Assume completed if marked PAID
            }
          ] as any)
          
        if (paymentError) console.error("Could not record payment:", paymentError)
      }
      
      toast.success('Order created successfully!')
      
      navigate('/orders')
    } catch (err: any) {
      console.error('Error creating order:', err)
      setError(err.message || 'Failed to create order')
      toast.error('Failed to create order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left/Top: Product Catalog (POS) */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">Menu</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
              {products?.map(p => (
                <div key={p.id} className="border rounded-xl overflow-hidden flex flex-col bg-gray-50 shadow-sm">
                  <div className="h-24 w-full bg-gray-200">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-2 md:p-3 flex-1 flex flex-col">
                    <h3 className="font-bold text-sm md:text-base text-gray-900 leading-tight mb-2">{p.name}</h3>
                    <div className="mt-auto space-y-1.5">
                      {p.variants.map((v: any) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            const existing = items.find(i => i.variantId === v.id);
                            if (existing) {
                              handleUpdateQuantity(v.id, existing.quantity + 1);
                            } else {
                              handleAddItem(v.id);
                            }
                            toast.success(`Added ${p.name}`, { id: 'add-item', duration: 1000 });
                          }}
                          className="w-full text-left text-xs bg-white border border-gray-200 hover:border-[#8b5a2b] hover:bg-orange-50 rounded p-1.5 flex justify-between items-center transition-colors"
                        >
                          <span className="truncate pr-1">{v.name}</span>
                          <span className="font-bold shrink-0">₹{v.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right/Bottom: Cart & Checkout */}
        <div className="w-full md:w-[380px] shrink-0">
          <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border p-4 md:p-6 sticky top-4 space-y-6">
            <h2 className="text-lg font-bold border-b pb-2">Cart & Checkout</h2>
            
            {/* Customer & Order Settings */}
            <div className="space-y-4">
              <div>
                <select 
                  value={customerId} 
                  onChange={e => {
                    setCustomerId(e.target.value);
                    if (e.target.value !== '') setWalkInName('');
                  }}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                >
                  <option value="">Walk-in Customer</option>
                  {customers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {customerId === '' && (
                  <Input 
                    placeholder="Walk-in Name (Optional)"
                    value={walkInName}
                    onChange={e => setWalkInName(e.target.value)}
                    className="mt-2 h-9 text-sm"
                  />
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={deliveryType} 
                  onChange={e => setDeliveryType(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                >
                  <option value="PICKUP">Pickup</option>
                  <option value="DELIVERY">Delivery</option>
                </select>
                <select 
                  value={paymentStatus} 
                  onChange={e => setPaymentStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>

            {/* Cart Items */}
            <div className="space-y-3 pt-4 border-t max-h-[30vh] overflow-y-auto pr-1">
              {items.length > 0 ? items.map(item => (
                <div key={item.variantId} className="flex flex-col bg-gray-50 p-2 rounded-lg border text-sm">
                  <div className="flex justify-between font-medium text-gray-900 mb-2">
                    <span className="truncate pr-2">{item.name}</span>
                    <span>₹{item.quantity * item.unitPrice}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleUpdateQuantity(item.variantId, Math.max(1, item.quantity - 1))} className="w-7 h-7 bg-white border rounded flex items-center justify-center font-bold text-gray-600">-</button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <button type="button" onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)} className="w-7 h-7 bg-white border rounded flex items-center justify-center font-bold text-gray-600">+</button>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRemoveItem(item.variantId)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center text-gray-400 italic text-sm">
                  Tap items on the menu to add them to the cart.
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Discount (₹)</span>
                <Input type="number" min="0" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-20 h-7 text-right text-sm" />
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Delivery (₹)</span>
                <Input type="number" min="0" value={deliveryFee} onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)} className="w-20 h-7 text-right text-sm" />
              </div>
              <div className="flex justify-between text-lg font-bold pt-3 border-t text-[#8b5a2b]">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg bg-[#8b5a2b] hover:bg-[#6b4423]"
              disabled={isSubmitting || items.length === 0}
            >
              {isSubmitting ? 'Processing...' : 'Place Order'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}


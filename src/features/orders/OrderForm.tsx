import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
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

  const handleUpdateUnitPrice = (variantId: string, unitPrice: number) => {
    if (unitPrice < 0) return
    setItems(prev => prev.map(i => i.variantId === variantId ? { ...i, unitPrice } : i))
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
              payment_method: 'CASH', // Default for now
              status: 'COMPLETED' // Assume completed if marked PAID
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
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Customer Info</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer (Optional)</label>
              <div className="space-y-2">
                <select 
                  value={customerId} 
                  onChange={e => {
                    setCustomerId(e.target.value);
                    if (e.target.value !== '') setWalkInName('');
                  }}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                >
                  <option value="">Walk-in Customer</option>
                  {customers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {customerId === '' && (
                  <Input 
                    placeholder="Walk-in Customer Name (Optional)"
                    value={walkInName}
                    onChange={e => setWalkInName(e.target.value)}
                  />
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Type</label>
                <select 
                  value={deliveryType} 
                  onChange={e => setDeliveryType(e.target.value)}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                >
                  <option value="PICKUP">Pickup</option>
                  <option value="DELIVERY">Delivery</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select 
                  value={paymentStatus} 
                  onChange={e => setPaymentStatus(e.target.value)}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Order Items</h2>
            </div>
            
            <div className="flex gap-2">
              <select 
                id="product-selector"
                className="flex flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                defaultValue=""
              >
                <option value="" disabled>Select a product to add...</option>
                {products?.map(p => (
                  <optgroup key={p.id} label={p.name}>
                    {p.variants.map(v => (
                      <option key={v.id} value={v.id}>{v.name} (₹{v.price})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <Button 
                type="button" 
                onClick={() => {
                  const select = document.getElementById('product-selector') as HTMLSelectElement
                  handleAddItem(select.value)
                  select.value = ''
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {items.length > 0 ? (
              <div className="space-y-3 mt-4">
                {items.map(item => (
                  <div key={item.variantId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">₹</span>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e => handleUpdateUnitPrice(item.variantId, parseFloat(e.target.value) || 0)}
                          className="w-24 h-8 text-sm"
                        />
                        <span className="text-sm text-gray-500">each</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={e => handleUpdateQuantity(item.variantId, parseInt(e.target.value) || 1)}
                        className="w-16 text-center"
                      />
                      <p className="font-medium w-16 text-right">₹{item.quantity * item.unitPrice}</p>
                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(item.variantId)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic py-4 text-center">No items added to the order yet.</p>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-600">Discount (₹)</span>
              <Input 
                type="number" 
                min="0" 
                value={discount} 
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 text-right"
              />
            </div>

            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-600">Delivery Fee (₹)</span>
              <Input 
                type="number" 
                min="0" 
                value={deliveryFee} 
                onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                className="w-24 text-right"
              />
            </div>

            <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-6">
            <Button 
              type="submit" 
              className="w-full bg-[#8b5a2b] hover:bg-[#6b4423]"
              disabled={isSubmitting || items.length === 0}
            >
              {isSubmitting ? 'Creating Order...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

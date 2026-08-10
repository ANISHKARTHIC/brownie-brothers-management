import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Edit2, Save, X, Phone, Mail, FileText, ShoppingBag } from 'lucide-react'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export function CustomerDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' })

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          orders (
            id, order_number, total, status, created_at
          )
        `)
        .eq('id', id!)
        .single()

      if (error) throw error
      return data as any
    },
    enabled: !!id
  })

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        notes: customer.notes || ''
      })
    }
  }, [customer])

  const updateMutation = useMutation({
    mutationFn: async (newData: typeof formData) => {
      const { error } = await (supabase as any)
        .from('customers')
        .update(newData)
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsEditing(false)
    }
  })

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent"></div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found.</p>
        <Button onClick={() => navigate('/customers')} className="mt-4">Back to Customers</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Customer Profile</h1>
        </div>
        {!isEditing && (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" /> Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <Input 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <Input 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+91..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <Input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <textarea 
                      className="w-full min-h-[80px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Allergies, preferences..."
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1 bg-[#8b5a2b] hover:bg-[#6b4423]"
                      onClick={() => updateMutation.mutate(formData)}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save</>}
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-none"
                      onClick={() => setIsEditing(false)}
                      disabled={updateMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-16 w-16 bg-[#8b5a2b] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-sm">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-bold text-center text-gray-900">{customer.name}</h2>
                  
                  <div className="space-y-3 pt-4 border-t">
                    {customer.phone && (
                      <div className="flex items-center gap-3 text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-3 text-gray-600">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{customer.email}</span>
                      </div>
                    )}
                    {customer.notes && (
                      <div className="flex items-start gap-3 text-gray-600">
                        <FileText className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-sm">{customer.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">Order History</h3>
                </div>
                <span className="text-sm text-gray-500 font-medium">
                  {customer.orders?.length || 0} Total Orders
                </span>
              </div>
              <div className="p-0">
                {customer.orders && customer.orders.length > 0 ? (
                  <div className="divide-y">
                    {customer.orders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((order: any) => (
                      <div 
                        key={order.id} 
                        className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <div>
                          <p className="font-medium text-gray-900">Order #{order.order_number}</p>
                          <p className="text-sm text-gray-500">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{order.total}</p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            order.status === 'READY' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                            order.status === 'DELIVERED' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                            order.status === 'CANCELLED' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                            'bg-orange-50 text-orange-700 ring-orange-600/20'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p>No orders yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

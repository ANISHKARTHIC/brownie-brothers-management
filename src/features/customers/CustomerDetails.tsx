import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  ArrowLeft,
  Phone,
  Mail,
  FileText,
  Edit3,
  Save,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShoppingBag,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

type OutstandingEntry = {
  id: string
  customer_id: string
  amount: number
  description: string
  is_settled: boolean
  settled_at: string | null
  created_at: string
  created_by: string | null
}

type CustomerOrder = {
  id: string
  order_number: number
  total: number
  status: string
  created_at: string
}

type CustomerFull = {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
  orders: CustomerOrder[]
}

export function CustomerDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'info' | 'outstanding' | 'orders'>('info')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' })

  // Add outstanding modal
  const [addOutstandingOpen, setAddOutstandingOpen] = useState(false)
  const [newAmount, setNewAmount] = useState('')
  const [newDesc, setNewDesc] = useState('')

  // Fetch customer
  const { data: customer, isLoading } = useQuery<CustomerFull>({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*, orders(id, order_number, total, status, created_at)')
        .eq('id', id!)
        .single()
      if (error) throw error
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        notes: data.notes || '',
      })
      return data as CustomerFull
    },
    enabled: !!id,
  })

  // Fetch outstanding entries
  const { data: outstandingEntries = [] } = useQuery<OutstandingEntry[]>({
    queryKey: ['customer_outstanding', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('customer_outstanding')
        .select('*')
        .eq('customer_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!id,
  })

  const totalOwed = outstandingEntries
    .filter((e) => !e.is_settled)
    .reduce((sum, e) => sum + Number(e.amount), 0)

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('customers')
        .update({ name: formData.name, phone: formData.phone, email: formData.email, notes: formData.notes })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Customer updated!')
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsEditing(false)
    },
    onError: (err: any) => toast.error(err.message || 'Update failed'),
  })

  // Add outstanding
  const addOutstandingMutation = useMutation({
    mutationFn: async () => {
      if (!newAmount || isNaN(Number(newAmount)) || Number(newAmount) <= 0) throw new Error('Enter a valid amount')
      if (!newDesc.trim()) throw new Error('Description is required')
      const { error } = await (supabase as any).from('customer_outstanding').insert([{
        customer_id: id,
        amount: Number(newAmount),
        description: newDesc.trim(),
        created_by: profile?.id || null,
      }])
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Outstanding entry added!')
      queryClient.invalidateQueries({ queryKey: ['customer_outstanding', id] })
      setAddOutstandingOpen(false)
      setNewAmount('')
      setNewDesc('')
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add'),
  })

  // Settle outstanding
  const settleMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await (supabase as any)
        .from('customer_outstanding')
        .update({ is_settled: true, settled_at: new Date().toISOString() })
        .eq('id', entryId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Marked as settled!')
      queryClient.invalidateQueries({ queryKey: ['customer_outstanding', id] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  // Delete outstanding
  const deleteOutstandingMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await (supabase as any)
        .from('customer_outstanding')
        .delete()
        .eq('id', entryId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Entry deleted')
      queryClient.invalidateQueries({ queryKey: ['customer_outstanding', id] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Customer not found.</p>
        <Button onClick={() => navigate('/customers')} className="mt-4">Back to Customers</Button>
      </div>
    )
  }

  const TABS = [
    { id: 'info', label: 'Info' },
    { id: 'outstanding', label: `Outstanding${totalOwed > 0 ? ` · ₹${totalOwed.toLocaleString('en-IN')}` : ''}` },
    { id: 'orders', label: `Orders (${customer.orders?.length || 0})` },
  ] as const

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Back */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Customers
      </button>

      {/* Customer Hero */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-[#f4e8d8] flex items-center justify-center text-[#8b5a2b] font-bold text-2xl flex-shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{customer.name}</h1>
            {customer.phone && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                <Phone className="h-3.5 w-3.5" />
                {customer.phone}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            {totalOwed > 0 ? (
              <div>
                <p className="text-xs text-orange-500 font-semibold">Owes</p>
                <p className="text-xl font-bold text-orange-600 tabular-nums">
                  ₹{totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-bold text-sm">Cleared</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Customer Info</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#8b5a2b] hover:bg-[#f4e8d8] px-3 py-1.5 rounded-xl transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#8b5a2b] px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              {[
                { label: 'Name', field: 'name', type: 'text', placeholder: 'Full name' },
                { label: 'Phone', field: 'phone', type: 'tel', placeholder: 'Phone number' },
                { label: 'Email', field: 'email', type: 'email', placeholder: 'Email address' },
                { label: 'Notes', field: 'notes', type: 'text', placeholder: 'Any notes...' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
                  <Input
                    type={type}
                    placeholder={placeholder}
                    value={formData[field as keyof typeof formData]}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { icon: Phone, label: 'Phone', value: customer.phone },
                { icon: Mail, label: 'Email', value: customer.email },
                { icon: FileText, label: 'Notes', value: customer.notes },
              ].map(({ icon: Icon, label, value }) =>
                value ? (
                  <div key={label} className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-xl flex-shrink-0">
                      <Icon className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
                      <p className="text-sm text-gray-900 font-medium mt-0.5">{value}</p>
                    </div>
                  </div>
                ) : null
              )}
              <p className="text-xs text-gray-400">
                Customer since {format(new Date(customer.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Outstanding */}
      {activeTab === 'outstanding' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`rounded-2xl p-5 ${totalOwed > 0 ? 'bg-orange-50 border border-orange-100' : 'bg-green-50 border border-green-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${totalOwed > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                  {totalOwed > 0 ? 'Amount Owed' : 'All Settled'}
                </p>
                <p className={`text-3xl font-bold tabular-nums ${totalOwed > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  ₹{totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Button
                onClick={() => setAddOutstandingOpen(true)}
                className="bg-[#8b5a2b] text-white rounded-2xl"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Entry
              </Button>
            </div>
          </div>

          {/* Entries */}
          {outstandingEntries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <p className="font-bold text-gray-900">No outstanding entries</p>
              <p className="text-sm text-gray-400 mt-1">All payments are cleared.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
              {outstandingEntries.map((entry) => (
                <div key={entry.id} className={`p-4 flex items-center justify-between ${entry.is_settled ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl flex-shrink-0 ${entry.is_settled ? 'bg-green-50' : 'bg-orange-50'}`}>
                      {entry.is_settled
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                        : <AlertCircle className="h-4 w-4 text-orange-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{entry.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(entry.created_at), 'MMM d, yyyy')}
                        {entry.is_settled && entry.settled_at && (
                          <span className="ml-2 text-green-600">· Settled {format(new Date(entry.settled_at), 'MMM d')}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className={`text-base font-bold tabular-nums ${entry.is_settled ? 'text-green-600 line-through' : 'text-orange-600'}`}>
                      ₹{Number(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    {!entry.is_settled && (
                      <button
                        onClick={() => settleMutation.mutate(entry.id)}
                        className="px-2.5 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors"
                      >
                        Settle
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Delete this entry?')) deleteOutstandingMutation.mutate(entry.id)
                      }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {!customer.orders || customer.orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="font-bold text-gray-900">No orders yet</p>
              <p className="text-sm text-gray-400 mt-1">This customer hasn't placed any orders.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {[...customer.orders]
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((order: any) => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50/80 transition-colors text-left"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Order #{order.order_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 tabular-nums">₹{Number(order.total).toLocaleString('en-IN')}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                        order.status === 'DELIVERED' ? 'bg-green-50 text-green-700' :
                        order.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Add Outstanding Modal */}
      {addOutstandingOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Outstanding</h2>
              <button
                onClick={() => setAddOutstandingOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="text-xl font-bold rounded-xl"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Description</label>
                <Input
                  type="text"
                  placeholder="e.g., Cake order Oct 20"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={() => setAddOutstandingOpen(false)}
                disabled={addOutstandingMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-2xl bg-[#8b5a2b] hover:bg-[#6b4423] text-white"
                onClick={() => addOutstandingMutation.mutate()}
                disabled={addOutstandingMutation.isPending}
              >
                {addOutstandingMutation.isPending ? 'Adding...' : 'Add Entry'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

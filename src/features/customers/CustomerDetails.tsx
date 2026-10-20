import { useState, useEffect } from 'react'
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
  Pencil,
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

  // Edit outstanding modal
  const [editingEntry, setEditingEntry] = useState<OutstandingEntry | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDesc, setEditDesc] = useState('')

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
      return data as CustomerFull
    },
    enabled: !!id,
  })

  // Sync formData safely in useEffect (NOT inside queryFn)
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        notes: customer.notes || '',
      })
    }
  }, [customer])

  // Fetch outstanding entries
  const { data: outstandingEntries = [] } = useQuery<OutstandingEntry[]>({
    queryKey: ['customer_outstanding', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('customer_outstanding')
        .select('*')
        .eq('customer_id', id!)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Error fetching customer outstanding:', error)
        return []
      }
      return data || []
    },
    enabled: !!id,
  })

  const totalOwed = outstandingEntries
    .filter((e) => !e.is_settled)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)

  // Invalidate all related caches to keep Accounts and Home in sync
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['customer', id] })
    queryClient.invalidateQueries({ queryKey: ['customer_outstanding', id] })
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    queryClient.invalidateQueries({ queryKey: ['accounts_customer_outstanding'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard_customer_outstanding'] })
  }

  // Update customer profile mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('customers')
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          notes: formData.notes.trim() || null,
        })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Customer details updated!')
      invalidateAll()
      setIsEditing(false)
    },
    onError: (err: any) => toast.error(err.message || 'Update failed'),
  })

  // Add outstanding mutation
  const addOutstandingMutation = useMutation({
    mutationFn: async () => {
      if (!newAmount || isNaN(Number(newAmount)) || Number(newAmount) <= 0) {
        throw new Error('Please enter a valid positive amount')
      }
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
      toast.success('Outstanding dues added!')
      invalidateAll()
      setAddOutstandingOpen(false)
      setNewAmount('')
      setNewDesc('')
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add'),
  })

  // Edit / Change outstanding entry mutation
  const editOutstandingMutation = useMutation({
    mutationFn: async () => {
      if (!editingEntry) return
      if (!editAmount || isNaN(Number(editAmount)) || Number(editAmount) <= 0) {
        throw new Error('Please enter a valid positive amount')
      }
      if (!editDesc.trim()) throw new Error('Description is required')

      const { error } = await (supabase as any)
        .from('customer_outstanding')
        .update({
          amount: Number(editAmount),
          description: editDesc.trim(),
        })
        .eq('id', editingEntry.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Outstanding dues updated!')
      invalidateAll()
      setEditingEntry(null)
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update entry'),
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
      invalidateAll()
    },
    onError: (err: any) => toast.error(err.message || 'Failed to settle'),
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
      invalidateAll()
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  })

  const openEditModal = (entry: OutstandingEntry) => {
    setEditingEntry(entry)
    setEditAmount(String(entry.amount))
    setEditDesc(entry.description)
  }

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-8 text-center text-gray-500 max-w-md mx-auto">
        <p className="text-base font-semibold">Customer not found.</p>
        <Button onClick={() => navigate('/customers')} className="mt-4 bg-[#8b5a2b] text-white">
          Back to Customers
        </Button>
      </div>
    )
  }

  const TABS = [
    { id: 'info', label: 'Info' },
    { id: 'outstanding', label: `Outstanding (${totalOwed > 0 ? `₹${totalOwed.toLocaleString('en-IN')}` : 'Cleared'})` },
    { id: 'orders', label: `Orders (${customer.orders?.length || 0})` },
  ] as const

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/customers')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </button>

      {/* Customer Hero Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-16 w-16 rounded-2xl bg-[#f4e8d8] flex items-center justify-center text-[#8b5a2b] font-extrabold text-2xl flex-shrink-0">
              {(customer.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                {customer.name}
              </h1>
              {customer.phone && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 font-medium">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </p>
              )}
            </div>
          </div>

          {/* Outstanding Summary Badge */}
          <div className="flex items-center gap-3">
            <div
              className={`rounded-2xl px-5 py-3 text-right flex-1 sm:flex-none ${
                totalOwed > 0 ? 'bg-orange-50 border border-orange-100' : 'bg-green-50 border border-green-100'
              }`}
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  totalOwed > 0 ? 'text-orange-500' : 'text-green-600'
                }`}
              >
                {totalOwed > 0 ? 'Outstanding Dues' : 'Account Status'}
              </p>
              <p
                className={`text-2xl font-extrabold tabular-nums ${
                  totalOwed > 0 ? 'text-orange-600' : 'text-green-600'
                }`}
              >
                ₹{totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Button
              onClick={() => {
                setActiveTab('outstanding')
                setAddOutstandingOpen(true)
              }}
              className="bg-[#8b5a2b] hover:bg-[#6b4423] text-white rounded-2xl text-xs font-semibold py-3"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Dues
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
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
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-base">Customer Details</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#8b5a2b] hover:bg-[#f4e8d8] px-3.5 py-2 rounded-xl transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Details
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#8b5a2b] hover:bg-[#6b4423] px-3.5 py-2 rounded-xl transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              {[
                { label: 'Customer Name *', field: 'name', type: 'text', placeholder: 'Full name' },
                { label: 'Phone Number', field: 'phone', type: 'tel', placeholder: 'e.g. 9876543210' },
                { label: 'Email Address', field: 'email', type: 'email', placeholder: 'e.g. client@example.com' },
                { label: 'Notes / Preferences', field: 'notes', type: 'text', placeholder: 'Notes about preferences or credit...' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                    {label}
                  </label>
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
                    <div className="p-2.5 bg-gray-50 rounded-xl flex-shrink-0">
                      <Icon className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
                      <p className="text-sm text-gray-900 font-medium mt-0.5">{value}</p>
                    </div>
                  </div>
                ) : null
              )}
              <p className="text-xs text-gray-400 pt-2 border-t border-gray-50">
                Customer created on {format(new Date(customer.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Outstanding (View, Add, Edit & Settle) */}
      {activeTab === 'outstanding' && (
        <div className="space-y-4">
          {/* Summary Box */}
          <div
            className={`rounded-3xl p-6 ${
              totalOwed > 0 ? 'bg-orange-50 border border-orange-100' : 'bg-green-50 border border-green-100'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                    totalOwed > 0 ? 'text-orange-500' : 'text-green-600'
                  }`}
                >
                  {totalOwed > 0 ? 'Current Outstanding Dues' : 'Account Settled'}
                </p>
                <p
                  className={`text-3xl md:text-4xl font-extrabold tabular-nums ${
                    totalOwed > 0 ? 'text-orange-600' : 'text-green-600'
                  }`}
                >
                  ₹{totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This amount is automatically added to the Outstanding total in Accounts.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setAddOutstandingOpen(true)}
                  className="bg-[#8b5a2b] hover:bg-[#6b4423] text-white rounded-2xl text-xs font-semibold"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add New Entry
                </Button>
              </div>
            </div>
          </div>

          {/* Outstanding Ledger Entries */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Outstanding Entries & History
              </h3>
              <span className="text-xs text-gray-400 font-medium">
                {outstandingEntries.length} total entries
              </span>
            </div>

            {outstandingEntries.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
                <p className="font-bold text-gray-900">No outstanding dues</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add an entry above whenever this customer has an amount to pay.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {outstandingEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      entry.is_settled ? 'opacity-60 bg-gray-50/50' : 'hover:bg-gray-50/50'
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl flex-shrink-0 ${
                          entry.is_settled ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-500'
                        }`}
                      >
                        {entry.is_settled ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {entry.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(entry.created_at), 'MMM d, yyyy')}
                          {entry.is_settled && entry.settled_at && (
                            <span className="ml-2 font-medium text-green-600">
                              · Settled {format(new Date(entry.settled_at), 'MMM d')}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                      <span
                        className={`text-base font-extrabold tabular-nums ${
                          entry.is_settled ? 'text-gray-400 line-through' : 'text-orange-600'
                        }`}
                      >
                        ₹{Number(entry.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(entry)}
                          className="p-1.5 text-gray-400 hover:text-[#8b5a2b] hover:bg-amber-50 rounded-xl transition-colors"
                          title="Edit amount or description"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {/* Settle Button */}
                        {!entry.is_settled && (
                          <button
                            onClick={() => settleMutation.mutate(entry.id)}
                            className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-xl transition-colors"
                            title="Mark as paid"
                          >
                            Settle
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            if (confirm('Delete this outstanding entry?')) {
                              deleteOutstandingMutation.mutate(entry.id)
                            }
                          }}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {!customer.orders || customer.orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="font-bold text-gray-900">No orders placed</p>
              <p className="text-xs text-gray-400 mt-1">Orders for this customer will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {[...customer.orders]
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((order: any) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Order #{order.order_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 tabular-nums">
                        ₹{Number(order.total || 0).toLocaleString('en-IN')}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                          order.status === 'DELIVERED'
                            ? 'bg-green-50 text-green-700'
                            : order.status === 'CANCELLED'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-orange-50 text-orange-600'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Add Outstanding Modal */}
      {addOutstandingOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">Add Outstanding Dues</h2>
              <button
                onClick={() => setAddOutstandingOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Customer: <span className="font-bold text-gray-700">{customer.name}</span>
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Amount (₹) *
                </label>
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
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Description / Reason *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Cake & brownies order, Credit delivery"
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
                className="flex-1 rounded-2xl bg-[#8b5a2b] hover:bg-[#6b4423] text-white font-semibold"
                onClick={() => addOutstandingMutation.mutate()}
                disabled={addOutstandingMutation.isPending}
              >
                {addOutstandingMutation.isPending ? 'Saving...' : 'Add Dues'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Outstanding Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">Edit Outstanding Entry</h2>
              <button
                onClick={() => setEditingEntry(null)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Change the amount or description for this entry.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Amount (₹) *
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="text-xl font-bold rounded-xl"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Description / Reason *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Cake & brownies order"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={() => setEditingEntry(null)}
                disabled={editOutstandingMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-2xl bg-[#8b5a2b] hover:bg-[#6b4423] text-white font-semibold"
                onClick={() => editOutstandingMutation.mutate()}
                disabled={editOutstandingMutation.isPending}
              >
                {editOutstandingMutation.isPending ? 'Updating...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

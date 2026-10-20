import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth/AuthContext'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Users,
  AlertCircle,
  Plus,
  ArrowRight,
  ClipboardList,
  Cookie,
  CheckCircle2,
  Phone,
} from 'lucide-react'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

type OutstandingCustomer = {
  id: string
  name: string
  phone: string | null
  outstanding: number
}

export function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  // 1. Fetch all customers
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['dashboard_customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, created_at')
        .order('name', { ascending: true })
      if (error) {
        console.error('Error loading customers:', error)
        return []
      }
      return data || []
    },
  })

  // 2. Fetch customer outstanding dues (strictly customers, NO store accounts)
  const { data: outstandingList = [], isLoading: isLoadingOutstanding } = useQuery<OutstandingCustomer[]>({
    queryKey: ['dashboard_customer_outstanding'],
    queryFn: async () => {
      const { data: entries, error } = await (supabase as any)
        .from('customer_outstanding')
        .select('amount, customer_id, customers(id, name, phone)')
        .eq('is_settled', false)

      if (error) {
        console.error('Error fetching customer outstanding:', error)
        return []
      }

      const map: Record<string, OutstandingCustomer> = {}
      for (const row of entries || []) {
        const cid = row.customer_id
        if (!map[cid]) {
          map[cid] = {
            id: cid,
            name: row.customers?.name || 'Customer',
            phone: row.customers?.phone || null,
            outstanding: 0,
          }
        }
        map[cid].outstanding += Number(row.amount || 0)
      }

      return Object.values(map).sort((a, b) => b.outstanding - a.outstanding)
    },
  })

  const totalOutstanding = outstandingList.reduce((sum, c) => sum + c.outstanding, 0)
  const customersWithDuesCount = outstandingList.length

  const quickLinks = [
    { label: 'Customers', icon: Users, path: '/customers', color: 'text-[#8b5a2b]', bg: 'bg-[#f4e8d8]' },
    { label: 'New Customer', icon: Plus, path: '/customers/new', color: 'text-amber-700', bg: 'bg-amber-100' },
    { label: 'Orders', icon: ClipboardList, path: '/orders', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Products', icon: Cookie, path: '/products', color: 'text-rose-600', bg: 'bg-rose-50' },
  ]

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Baker'} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customers/new')}
            className="inline-flex items-center gap-2 bg-[#8b5a2b] hover:bg-[#6b4423] text-white px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Main Stats Cards (Customer Outstanding & Active Customers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Outstanding Card */}
        <div
          onClick={() => navigate('/customers')}
          className="cursor-pointer bg-gradient-to-br from-[#8b5a2b] to-[#6b4423] rounded-3xl p-6 text-white shadow-md hover:shadow-lg transition-all duration-200 relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-orange-200/80 text-xs font-semibold uppercase tracking-widest mb-1">
                Customer Outstanding
              </p>
              <p className="text-3xl md:text-4xl font-bold tabular-nums">
                ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
              <AlertCircle className="h-6 w-6 text-orange-200" />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between text-xs text-orange-200/90 pt-3 border-t border-white/15">
            <span>
              {isLoadingOutstanding
                ? 'Calculating...'
                : customersWithDuesCount > 0
                ? `${customersWithDuesCount} customer${customersWithDuesCount > 1 ? 's' : ''} with pending dues`
                : 'All customer dues are cleared'}
            </span>
            <span className="flex items-center gap-1 font-semibold text-white">
              View Dues <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        {/* Total Customers Card */}
        <div
          onClick={() => navigate('/customers')}
          className="cursor-pointer bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
                Total Customers
              </p>
              <p className="text-3xl md:text-4xl font-bold text-gray-900 tabular-nums">
                {isLoadingCustomers ? '...' : customers.length}
              </p>
            </div>
            <div className="p-3 bg-[#f4e8d8] rounded-2xl">
              <Users className="h-6 w-6 text-[#8b5a2b]" />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-50">
            <span>Manage customer profiles & contact details</span>
            <span className="flex items-center gap-1 font-semibold text-[#8b5a2b]">
              Directory <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => navigate(link.path)}
              className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all text-left"
            >
              <div className={`p-2.5 rounded-xl ${link.bg} flex-shrink-0`}>
                <link.icon className={`h-5 w-5 ${link.color}`} />
              </div>
              <span className="text-xs font-bold text-gray-800">{link.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pending Customer Dues Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pending Customer Dues</h2>
            <p className="text-xs text-gray-500">Tap any customer to view details or change their outstanding</p>
          </div>
          <button
            onClick={() => navigate('/customers')}
            className="text-xs font-semibold text-[#8b5a2b] hover:text-[#6b4423] transition-colors"
          >
            View all customers →
          </button>
        </div>

        {isLoadingOutstanding ? (
          <div className="p-12 bg-white rounded-2xl border border-gray-100 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent mx-auto" />
            <p className="text-xs text-gray-400 mt-3 font-medium">Checking customer balances...</p>
          </div>
        ) : outstandingList.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
            <div className="p-3 bg-green-50 rounded-2xl w-fit mx-auto mb-2">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">All Cleared!</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              There are no pending customer dues at the moment.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
            {outstandingList.slice(0, 5).map((cust) => (
              <div
                key={cust.id}
                onClick={() => navigate(`/customers/${cust.id}`)}
                className="p-4 flex items-center justify-between hover:bg-gray-50/80 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-[#f4e8d8] flex items-center justify-center text-[#8b5a2b] font-bold text-base flex-shrink-0">
                    {(cust.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{cust.name}</p>
                    {cust.phone && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        {cust.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600 tabular-nums">
                      ₹{cust.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">
                      Owed
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

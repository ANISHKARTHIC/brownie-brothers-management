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
  CheckCircle2,
  Phone,
  Boxes,
  PackageX,
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

type LowItem = { id: string; name: string; unit: string; current_stock: number; min_stock: number }

export function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data: lowStock = [] } = useQuery<LowItem[]>({
    queryKey: ['stock-items', 'low'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('inventory_items').select('id,name,unit,current_stock,min_stock')
      return ((data || []) as LowItem[]).filter((i) => Number(i.current_stock) <= Number(i.min_stock))
    },
  })

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
    { label: 'Stock', icon: Boxes, path: '/stock', color: 'text-[#4f7a4a]', bg: 'bg-[#e9f0e4]' },
  ]

  return (
    <div className="page-shell p-4 md:p-10 space-y-8">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-[#84766c] text-sm font-medium">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-[#3d2b20] mt-1">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Baker'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customers/new')}
            className="inline-flex items-center gap-2 bg-[#8b5a2b] hover:bg-[#6b4423] text-white px-4 py-3 rounded-2xl text-sm font-semibold shadow-[0_8px_18px_rgba(107,68,35,0.18)] transition-all"
          >
            <Plus className="h-4 w-4" />
            Add customer
          </button>
        </div>
      </div>

      {/* Main Stats Cards (Customer Outstanding & Active Customers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Outstanding Card */}
        <div
          onClick={() => navigate('/customers')}
          className="cursor-pointer bg-[#3d2b20] rounded-[1.75rem] p-5 sm:p-6 text-white shadow-[0_12px_28px_rgba(107,68,35,0.2)] hover:shadow-lg press transition-all duration-200 relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#e8d5bc] text-sm font-medium mb-1">
                Customer Outstanding
              </p>
              <p className="font-display text-4xl md:text-5xl font-bold tabular-nums">
                ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
              <AlertCircle className="h-6 w-6 text-[#e8d5bc]" />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between text-xs text-[#e8d5bc] pt-3 border-t border-white/15">
            <span>
              {isLoadingOutstanding
                ? 'Calculating...'
                : customersWithDuesCount > 0
                ? `${customersWithDuesCount} customer${customersWithDuesCount > 1 ? 's' : ''} with pending dues`
                : 'All customer dues are cleared'}
            </span>
            <span className="flex items-center gap-1 font-semibold text-white">
              View dues <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        {/* Total Customers Card */}
        <div
          onClick={() => navigate('/customers')}
          className="cursor-pointer bg-[#fffdfa] rounded-[1.75rem] p-5 sm:p-6 border border-[#eee3d9] shadow-[0_8px_24px_rgba(74,45,24,0.05)] hover:shadow-md press transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#84766c] text-sm font-medium mb-1">
                Total Customers
              </p>
              <p className="font-display text-4xl md:text-5xl font-bold text-[#3d2b20] tabular-nums">
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

      {lowStock.length > 0 && (
        <button
          onClick={() => navigate('/stock')}
          className="press w-full flex items-center gap-3 p-4 rounded-2xl bg-[#fbeceb] border border-[#f0c9c5] text-left"
        >
          <PackageX className="h-5 w-5 text-[#b4382f] shrink-0" />
          <span className="flex-1 min-w-0 text-sm text-[#7a2a23]">
            <b>{lowStock.length} ingredient{lowStock.length > 1 ? 's' : ''} running low</b>
            <span className="block truncate text-[#9a4a43]">{lowStock.slice(0, 4).map((i) => i.name).join(', ')}</span>
          </span>
          <ArrowRight className="h-4 w-4 text-[#b4382f] shrink-0" />
        </button>
      )}

      {/* Quick Action Buttons */}
      <div>
        <p className="text-sm font-semibold text-[#84766c] mb-3 px-1">
          Quick actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {quickLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => navigate(link.path)}
              className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 press transition-all text-left"
            >
              <div className={`p-2.5 rounded-xl ${link.bg} flex-shrink-0`}>
                <link.icon className={`h-5 w-5 ${link.color}`} />
              </div>
              <span className="text-xs font-bold text-gray-800">{link.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pending dues Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pending dues</h2>
            <p className="text-xs text-gray-500">Tap any customer to view details or change their outstanding</p>
          </div>
          <button
            onClick={() => navigate('/customers')}
            className="text-xs font-semibold text-[#8b5a2b] hover:text-[#6b4423] transition-colors"
          >
            View all
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
            <h3 className="text-sm font-bold text-gray-900">All dues cleared</h3>
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
                    <p className="text-sm font-bold text-[#b4382f] tabular-nums">
                      ₹{cust.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] font-semibold text-orange-400">
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

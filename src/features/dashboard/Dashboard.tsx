import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth/AuthContext'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Landmark,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  TrendingUp,
  Plus,
} from 'lucide-react'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

type QuickAction = {
  label: string
  icon: React.ElementType
  path: string
  color: string
  bg: string
}

export function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  // Fetch all accounts for grand total
  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ['store_accounts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('store_accounts')
        .select('balance')
      if (error) throw error
      return data || []
    },
  })
  const totalCash = accounts.reduce((sum: number, a: any) => sum + Number(a.balance), 0)

  // Fetch customer outstanding
  const { data: outstandingEntries = [] } = useQuery<any[]>({
    queryKey: ['customer_outstanding_all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('customer_outstanding')
        .select('amount, customer_id, customers(name)')
        .eq('is_settled', false)
      if (error) throw error
      return data || []
    },
  })
  const totalOutstanding = outstandingEntries.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

  // Fetch recent account transactions
  const { data: recentTx = [] } = useQuery<any[]>({
    queryKey: ['recent_transactions_home'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('account_transactions')
        .select('*, store_accounts(name)')
        .order('created_at', { ascending: false })
        .limit(4)
      if (error) throw error
      return data || []
    },
  })

  // Top outstanding customers
  const outstandingByCustomer: Record<string, { name: string; amount: number }> = {}
  for (const e of outstandingEntries) {
    const cid = e.customer_id
    if (!outstandingByCustomer[cid]) {
      outstandingByCustomer[cid] = { name: e.customers?.name || 'Unknown', amount: 0 }
    }
    outstandingByCustomer[cid].amount += Number(e.amount)
  }
  const topOutstanding = Object.entries(outstandingByCustomer)
    .map(([, v]) => v)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  const quickActions: QuickAction[] = [
    { label: 'Add Cash', icon: ArrowUpRight, path: '/accounts', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Add Customer', icon: Plus, path: '/customers/new', color: 'text-[#8b5a2b]', bg: 'bg-[#f4e8d8]' },
    { label: 'View Ledger', icon: Landmark, path: '/accounts', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Customers', icon: Users, path: '/customers', color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Greeting */}
      <div>
        <p className="text-gray-400 text-sm font-medium">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
          {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'there'} 👋
        </h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cash on Hand */}
        <button
          onClick={() => navigate('/accounts')}
          className="bg-gradient-to-br from-[#8b5a2b] to-[#6b4423] rounded-2xl p-5 text-left shadow-md hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <Landmark className="h-5 w-5 text-white" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-orange-200/60" />
          </div>
          <p className="text-orange-200/80 text-xs font-semibold uppercase tracking-widest">Cash on Hand</p>
          <p className="text-2xl font-bold text-white tabular-nums mt-1">
            ₹{totalCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </button>

        {/* Outstanding */}
        <button
          onClick={() => navigate('/customers')}
          className={`rounded-2xl p-5 text-left shadow-md hover:shadow-lg transition-shadow duration-200 ${
            totalOutstanding > 0
              ? 'bg-gradient-to-br from-orange-500 to-orange-600'
              : 'bg-gradient-to-br from-green-500 to-green-600'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-white/20 rounded-xl">
              {totalOutstanding > 0
                ? <AlertCircle className="h-5 w-5 text-white" />
                : <TrendingUp className="h-5 w-5 text-white" />}
            </div>
            <ArrowUpRight className="h-4 w-4 text-white/40" />
          </div>
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Outstanding</p>
          <p className="text-2xl font-bold text-white tabular-nums mt-1">
            ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </button>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Quick Actions</p>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200"
            >
              <div className={`p-2.5 rounded-xl ${action.bg}`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <span className="text-[10px] font-bold text-gray-600 text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Two column layout on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Recent Transactions</p>
            <button
              onClick={() => navigate('/accounts')}
              className="text-xs font-semibold text-[#8b5a2b] hover:underline"
            >
              View all
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {recentTx.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Landmark className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentTx.map((tx: any) => {
                  const isIncome = tx.type === 'DEPOSIT' || tx.type === 'INITIAL'
                  return (
                    <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
                          isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                        }`}>
                          {isIncome
                            ? <ArrowUpRight className="w-4 h-4" />
                            : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{tx.remarks}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {tx.store_accounts?.name} · {format(new Date(tx.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold tabular-nums flex-shrink-0 ml-3 ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Outstanding Customers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Top Outstanding</p>
            <button
              onClick={() => navigate('/customers')}
              className="text-xs font-semibold text-[#8b5a2b] hover:underline"
            >
              View all
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {topOutstanding.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">All payments cleared!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {topOutstanding.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => navigate('/customers')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-[#f4e8d8] flex items-center justify-center text-[#8b5a2b] font-bold text-sm flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
                      <span className="text-sm font-bold text-orange-600 tabular-nums">
                        ₹{c.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

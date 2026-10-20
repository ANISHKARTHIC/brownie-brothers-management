import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  History,
  Trash2,
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  X,
  TrendingUp,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

type Account = {
  id: string
  name: string
  balance: number
  account_type: string
  created_at: string
}

type Transaction = {
  id: string
  account_id: string
  type: string
  amount: number
  remarks: string
  created_at: string
  profiles?: { full_name: string }
  store_accounts?: { name: string }
}

const ACCOUNT_TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  CASH:  { icon: Wallet,     color: 'text-green-600',  bg: 'bg-green-50'  },
  BANK:  { icon: Building2,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
  UPI:   { icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-50' },
  OTHER: { icon: CreditCard, color: 'text-gray-600',   bg: 'bg-gray-50'   },
}

function AccountCard({
  account,
  onDeposit,
  onWithdraw,
}: {
  account: Account
  onDeposit: (acc: Account) => void
  onWithdraw: (acc: Account) => void
}) {
  const meta = ACCOUNT_TYPE_META[account.account_type] || ACCOUNT_TYPE_META.OTHER
  const Icon = meta.icon

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${meta.bg}`}>
            <Icon className={`h-5 w-5 ${meta.color}`} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">{account.name}</p>
            <p className="text-xs text-gray-400 font-medium capitalize mt-0.5">{account.account_type.toLowerCase()}</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Balance</p>
        <p className="text-3xl font-bold text-gray-900 tabular-nums">
          ₹{Number(account.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onWithdraw(account)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
        >
          <ArrowDownRight className="h-4 w-4" />
          Withdraw
        </button>
        <button
          onClick={() => onDeposit(account)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-green-50 text-green-600 text-sm font-semibold hover:bg-green-100 transition-colors"
        >
          <ArrowUpRight className="h-4 w-4" />
          Deposit
        </button>
      </div>
    </div>
  )
}

export function Accounts() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'overview' | 'ledger'>('overview')

  // Transaction modal
  const [txModal, setTxModal] = useState<{ open: boolean; type: 'DEPOSIT' | 'WITHDRAWAL'; account: Account | null }>({
    open: false,
    type: 'DEPOSIT',
    account: null,
  })
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')

  // Add account modal
  const [addModal, setAddModal] = useState(false)
  const [newAccName, setNewAccName] = useState('')
  const [newAccType, setNewAccType] = useState<'CASH' | 'BANK' | 'UPI' | 'OTHER'>('CASH')
  const [newAccOpening, setNewAccOpening] = useState('')

  // Ledger filter
  const [ledgerFilter, setLedgerFilter] = useState<string>('ALL')

  // Fetch all accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ['store_accounts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('store_accounts')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  // Grand total
  const grandTotal = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

  // Outstanding balance from orders
  const { data: outstandingBalance = 0 } = useQuery<number>({
    queryKey: ['outstanding_balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total')
        .eq('payment_status', 'PENDING')
      if (error) throw error
      return (data || []).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0)
    },
  })

  // Fetch all transactions
  const { data: transactions = [], isLoading: isLoadingTx } = useQuery<Transaction[]>({
    queryKey: ['account_transactions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('account_transactions')
        .select(`*, profiles ( full_name ), store_accounts ( name )`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const filteredTx = ledgerFilter === 'ALL'
    ? transactions
    : transactions.filter((t) => t.account_id === ledgerFilter)

  // Process transaction mutation
  const processTxMutation = useMutation({
    mutationFn: async () => {
      if (!txModal.account) throw new Error('No account selected')
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) throw new Error('Enter a valid amount')
      if (!remarks.trim()) throw new Error('Remarks are required')

      const { error } = await (supabase as any).rpc('process_transaction', {
        p_account_id: txModal.account.id,
        p_type: txModal.type,
        p_amount: Number(amount),
        p_remarks: remarks,
        p_user_id: profile?.id || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(`${txModal.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} successful!`)
      queryClient.invalidateQueries({ queryKey: ['store_accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account_transactions'] })
      setTxModal({ open: false, type: 'DEPOSIT', account: null })
      setAmount('')
      setRemarks('')
    },
    onError: (err: any) => toast.error(err.message || 'Transaction failed'),
  })

  // Delete/reverse transaction
  const deleteTxMutation = useMutation({
    mutationFn: async (txId: string) => {
      const { error } = await (supabase as any).rpc('reverse_transaction', { p_transaction_id: txId })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Transaction reversed')
      queryClient.invalidateQueries({ queryKey: ['store_accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account_transactions'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to reverse'),
  })

  // Add account mutation
  const addAccountMutation = useMutation({
    mutationFn: async () => {
      if (!newAccName.trim()) throw new Error('Account name is required')
      const opening = Number(newAccOpening) || 0
      const { error } = await (supabase as any)
        .from('store_accounts')
        .insert([{ name: newAccName.trim(), balance: opening, account_type: newAccType }])
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Account created!')
      queryClient.invalidateQueries({ queryKey: ['store_accounts'] })
      setAddModal(false)
      setNewAccName('')
      setNewAccType('CASH')
      setNewAccOpening('')
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create account'),
  })

  const openTxModal = (type: 'DEPOSIT' | 'WITHDRAWAL', account: Account) => {
    setTxModal({ open: true, type, account })
    setAmount('')
    setRemarks('')
  }

  if (isLoadingAccounts) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your cash flow & balances</p>
        </div>
        <Button
          onClick={() => setAddModal(true)}
          className="bg-[#8b5a2b] hover:bg-[#6b4423] text-white rounded-2xl shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Account
        </Button>
      </div>

      {/* Grand Total Hero Card */}
      <div className="bg-gradient-to-br from-[#8b5a2b] to-[#6b4423] rounded-3xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-orange-200/80 text-xs font-semibold uppercase tracking-widest mb-1">Total Balance</p>
            <p className="text-4xl font-bold tabular-nums">
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl">
            <Landmark className="h-6 w-6 text-orange-200" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <div>
            <p className="text-orange-200/70 text-xs font-medium">Orders Outstanding</p>
            <p className="text-white font-bold tabular-nums">
              + ₹{outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-orange-200/70 text-xs font-medium">Total Expected</p>
            <p className="text-white font-bold tabular-nums">
              ₹{(grandTotal + outstandingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-2 bg-white/10 rounded-xl">
            <TrendingUp className="h-4 w-4 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {(['overview', 'ledger'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' ? 'Overview' : 'Ledger'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {accounts.length === 0 ? (
            <div className="text-center py-20">
              <div className="p-5 bg-[#f4e8d8] rounded-3xl w-fit mx-auto mb-4">
                <Landmark className="h-10 w-10 text-[#8b5a2b]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No accounts yet</h3>
              <p className="text-gray-500 text-sm mb-6">Add your first account to start tracking cash flow.</p>
              <Button onClick={() => setAddModal(true)} className="bg-[#8b5a2b] text-white rounded-2xl">
                <Plus className="h-4 w-4 mr-1.5" /> Add Account
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onDeposit={(acc) => openTxModal('DEPOSIT', acc)}
                  onWithdraw={(acc) => openTxModal('WITHDRAWAL', acc)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Ledger filter */}
          <div className="p-4 border-b border-gray-50 flex items-center gap-3 overflow-x-auto">
            <History className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <button
              onClick={() => setLedgerFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-colors ${
                ledgerFilter === 'ALL'
                  ? 'bg-[#f4e8d8] text-[#8b5a2b]'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              All Accounts
            </button>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setLedgerFilter(acc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-colors ${
                  ledgerFilter === acc.id
                    ? 'bg-[#f4e8d8] text-[#8b5a2b]'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {acc.name}
              </button>
            ))}
          </div>

          {isLoadingTx ? (
            <div className="p-12 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent" />
            </div>
          ) : filteredTx.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredTx.map((tx) => {
                const isIncome = tx.type === 'DEPOSIT' || tx.type === 'INITIAL'
                const within24h = new Date().getTime() - new Date(tx.created_at).getTime() < 24 * 60 * 60 * 1000
                return (
                  <div key={tx.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${
                        isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {isIncome
                          ? <ArrowUpRight className="w-5 h-5" />
                          : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{tx.remarks}</p>
                        <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <span>{format(new Date(tx.created_at), 'MMM d, h:mm a')}</span>
                          {tx.store_accounts?.name && (
                            <>
                              <span>·</span>
                              <span className="font-medium text-gray-500">{tx.store_accounts.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className={`text-base font-bold tabular-nums ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      {within24h && (
                        <button
                          onClick={() => {
                            if (confirm('Reverse this transaction?')) deleteTxMutation.mutate(tx.id)
                          }}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Reverse (available 24h)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Transaction Modal */}
      {txModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">
                {txModal.type === 'DEPOSIT' ? 'Add Deposit' : 'Withdraw Funds'}
              </h2>
              <button
                onClick={() => setTxModal({ open: false, type: 'DEPOSIT', account: null })}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Account: <span className="font-semibold text-gray-600">{txModal.account?.name}</span>
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-xl font-bold rounded-xl"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Remarks</label>
                <Input
                  type="text"
                  placeholder={txModal.type === 'DEPOSIT' ? 'e.g., End of day cash' : 'e.g., Vendor payment'}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={() => setTxModal({ open: false, type: 'DEPOSIT', account: null })}
                disabled={processTxMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 rounded-2xl text-white font-semibold ${
                  txModal.type === 'DEPOSIT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                }`}
                onClick={() => processTxMutation.mutate()}
                disabled={processTxMutation.isPending}
              >
                {processTxMutation.isPending ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">New Account</h2>
              <button
                onClick={() => setAddModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Account Name</label>
                <Input
                  placeholder="e.g., Petty Cash, Bank HDFC"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="rounded-xl"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CASH', 'BANK', 'UPI', 'OTHER'] as const).map((type) => {
                    const m = ACCOUNT_TYPE_META[type]
                    const Icon = m.icon
                    return (
                      <button
                        key={type}
                        onClick={() => setNewAccType(type)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          newAccType === type
                            ? 'border-[#8b5a2b] bg-[#f4e8d8]'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${newAccType === type ? 'text-[#8b5a2b]' : m.color}`} />
                        <span className={`text-[10px] font-bold ${newAccType === type ? 'text-[#8b5a2b]' : 'text-gray-500'}`}>
                          {type}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Opening Balance (₹)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newAccOpening}
                  onChange={(e) => setNewAccOpening(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={() => setAddModal(false)}
                disabled={addAccountMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-2xl bg-[#8b5a2b] hover:bg-[#6b4423] text-white"
                onClick={() => addAccountMutation.mutate()}
                disabled={addAccountMutation.isPending}
              >
                {addAccountMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

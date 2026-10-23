import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useNavigate } from 'react-router-dom'
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
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

type Account = {
  id: string
  name: string
  balance: number
  account_type?: string | null
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

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000]

const DEPOSIT_REMARK_PRESETS = [
  'Cash Sales',
  'End of Day Addition',
  'Owner Deposit',
  'Customer Direct Payment',
]

const WITHDRAW_REMARK_PRESETS = [
  'Milk & Ingredients',
  'Packaging Material',
  'Vendor Payment',
  'Staff Advance / Salary',
  'Daily Misc Expense',
]

function AccountCard({
  account,
  onDeposit,
  onWithdraw,
}: {
  account: Account
  onDeposit: (acc: Account) => void
  onWithdraw: (acc: Account) => void
}) {
  const accType = (account.account_type || 'CASH').toUpperCase()
  const meta = ACCOUNT_TYPE_META[accType] || ACCOUNT_TYPE_META.CASH
  const Icon = meta.icon

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col justify-between gap-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${meta.bg} flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${meta.color}`} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">{account.name}</p>
            <p className="text-[11px] text-gray-400 font-medium capitalize mt-0.5">
              {accType.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
          Available Balance
        </p>
        <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tabular-nums">
          ₹{Number(account.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
        <button
          type="button"
          onClick={() => onWithdraw(account)}
          className="w-full flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-red-50 text-red-600 text-xs sm:text-sm font-bold hover:bg-red-100 active:scale-[0.98] transition-all"
        >
          <ArrowDownRight className="h-4 w-4" />
          Withdraw
        </button>
        <button
          type="button"
          onClick={() => onDeposit(account)}
          className="w-full flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-green-50 text-green-700 text-xs sm:text-sm font-bold hover:bg-green-100 active:scale-[0.98] transition-all"
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
  const navigate = useNavigate()

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

  // 1. Fetch all store accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ['store_accounts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('store_accounts')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) {
        console.error('Error loading store accounts:', error)
        return []
      }
      return data || []
    },
  })

  // Grand total across all cash/bank accounts
  const grandTotal = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0)

  // 2. Fetch customer outstanding directly from customer_outstanding table
  const { data: customerOutstanding = 0 } = useQuery<number>({
    queryKey: ['accounts_customer_outstanding'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('customer_outstanding')
        .select('amount')
        .eq('is_settled', false)

      if (error) {
        console.error('Error fetching customer outstanding for accounts:', error)
        return 0
      }

      return (data || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
    },
  })

  // 3. Fetch all account ledger transactions
  const { data: transactions = [], isLoading: isLoadingTx } = useQuery<Transaction[]>({
    queryKey: ['account_transactions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('account_transactions')
        .select(`*, profiles ( full_name ), store_accounts ( name )`)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Error loading account transactions:', error)
        return []
      }
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
        p_remarks: remarks.trim(),
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

  const handleAddPresetAmount = (value: number) => {
    const current = Number(amount) || 0
    setAmount(String(current + value))
  }

  if (isLoadingAccounts) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
            Accounts & Cash
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Track split cash, bank, and customer outstanding
          </p>
        </div>
        <Button
          onClick={() => setAddModal(true)}
          className="bg-[#8b5a2b] hover:bg-[#6b4423] text-white rounded-2xl shadow-sm text-xs md:text-sm py-2 sm:py-2.5 px-3 sm:px-4 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Account
        </Button>
      </div>

      {/* Grand Total Hero Card */}
      <div className="bg-gradient-to-br from-[#8b5a2b] to-[#6b4423] rounded-3xl p-5 sm:p-7 text-white shadow-lg">
        <div className="flex items-start justify-between mb-4 sm:mb-6">
          <div>
            <p className="text-orange-200/80 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">
              Total Balance in Accounts
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold tabular-nums">
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-2.5 sm:p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
            <Landmark className="h-6 w-6 text-orange-200" />
          </div>
        </div>

        {/* Added Customer Outstanding row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/20">
          <div
            onClick={() => navigate('/customers')}
            className="cursor-pointer bg-white/10 hover:bg-white/15 active:bg-white/20 p-3.5 rounded-2xl transition-all flex items-center justify-between"
          >
            <div>
              <p className="text-orange-200 text-xs font-semibold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Added Customer Outstanding
              </p>
              <p className="text-white font-extrabold text-base sm:text-lg tabular-nums mt-0.5">
                + ₹{customerOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-orange-200 font-bold">
              <span>View</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white/10 p-3.5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-xs font-semibold flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Total Expected Assets
              </p>
              <p className="text-white font-extrabold text-base sm:text-lg tabular-nums mt-0.5">
                ₹{(grandTotal + customerOutstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-orange-200/60" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-full sm:w-fit">
        {(['overview', 'ledger'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold capitalize transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' ? 'Split Accounts' : 'Ledger History'}
          </button>
        ))}
      </div>

      {/* Tab: Overview (Split Accounts) */}
      {activeTab === 'overview' && (
        <>
          {accounts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="p-4 bg-[#f4e8d8] rounded-3xl w-fit mx-auto mb-4">
                <Landmark className="h-10 w-10 text-[#8b5a2b]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Accounts Yet</h3>
              <p className="text-gray-500 text-xs sm:text-sm mb-6 max-w-sm mx-auto">
                Add your split accounts (such as Main Register Cash, Petty Cash, Bank Account, or UPI) to track them separately.
              </p>
              <Button
                onClick={() => setAddModal(true)}
                className="bg-[#8b5a2b] hover:bg-[#6b4423] text-white rounded-2xl py-3 px-6 text-sm font-bold active:scale-95 transition-transform"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Add First Account
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
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

      {/* Tab: Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Ledger filter */}
          <div className="p-3 sm:p-4 border-b border-gray-50 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <History className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <button
              onClick={() => setLedgerFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-colors ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-colors ${
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
              <p className="font-semibold text-sm text-gray-600">No transactions recorded yet</p>
              <p className="text-xs text-gray-400 mt-1">Deposits and withdrawals will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredTx.map((tx) => {
                const isIncome = tx.type === 'DEPOSIT' || tx.type === 'INITIAL'
                const within24h = new Date().getTime() - new Date(tx.created_at).getTime() < 24 * 60 * 60 * 1000
                return (
                  <div key={tx.id} className="p-4 sm:px-5 sm:py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${
                        isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {isIncome
                          ? <ArrowUpRight className="w-5 h-5" />
                          : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{tx.remarks}</p>
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
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-3">
                      <span className={`text-sm sm:text-base font-extrabold tabular-nums ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'}₹{Number(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      {within24h && (
                        <button
                          onClick={() => {
                            if (confirm('Reverse this transaction? This will restore the account balance.')) {
                              deleteTxMutation.mutate(tx.id)
                            }
                          }}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Reverse (available within 24h)"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* ========================================================
          MOBILE BOTTOM SHEET: DEPOSIT / WITHDRAWAL
          Native touch-optimized bottom sheet with quick amounts & presets
         ======================================================== */}
      {txModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
          {/* Backdrop click to dismiss */}
          <div
            className="absolute inset-0"
            onClick={() => setTxModal({ open: false, type: 'DEPOSIT', account: null })}
          />

          <div className="relative bg-white rounded-t-[32px] sm:rounded-3xl w-full max-w-md p-5 sm:p-7 shadow-2xl max-h-[92dvh] overflow-y-auto animate-slide-up z-10 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
            {/* Top mobile drawer grab handle */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${txModal.type === 'DEPOSIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {txModal.type === 'DEPOSIT' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">
                    {txModal.type === 'DEPOSIT' ? 'Deposit Funds' : 'Withdraw Funds'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Target Account: <span className="font-bold text-[#8b5a2b]">{txModal.account?.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTxModal({ open: false, type: 'DEPOSIT', account: null })}
                className="p-2.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 my-5">
              {/* Amount input with quick presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Amount (₹) *
                  </label>
                  {amount && (
                    <button
                      type="button"
                      onClick={() => setAmount('')}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xl font-extrabold text-gray-400">₹</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-2xl font-extrabold rounded-2xl pl-9 h-14 bg-gray-50 border-gray-200 focus:bg-white"
                    autoFocus
                  />
                </div>

                {/* Quick Amount Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-2.5 pt-1">
                  {QUICK_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleAddPresetAmount(val)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-[#f4e8d8] hover:text-[#8b5a2b] active:scale-95 text-gray-700 text-xs font-bold rounded-xl whitespace-nowrap transition-all"
                    >
                      +{val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks with quick suggestions */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Reason / Remarks *
                </label>
                <Input
                  type="text"
                  placeholder={txModal.type === 'DEPOSIT' ? 'e.g. Cash Sales, Direct deposit' : 'e.g. Milk & dairy, Packaging'}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="rounded-2xl h-12 text-sm"
                />

                {/* Quick Remark Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-2 pt-1">
                  {(txModal.type === 'DEPOSIT' ? DEPOSIT_REMARK_PRESETS : WITHDRAW_REMARK_PRESETS).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRemarks(preset)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap border transition-all active:scale-95 ${
                        remarks === preset
                          ? 'bg-[#8b5a2b] text-white border-[#8b5a2b]'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-2xl h-13 font-bold text-sm"
                onClick={() => setTxModal({ open: false, type: 'DEPOSIT', account: null })}
                disabled={processTxMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={`flex-1 rounded-2xl h-13 text-white font-extrabold text-sm shadow-md active:scale-98 transition-all ${
                  txModal.type === 'DEPOSIT'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={() => processTxMutation.mutate()}
                disabled={processTxMutation.isPending}
              >
                {processTxMutation.isPending ? 'Saving...' : `Confirm ${txModal.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MOBILE BOTTOM SHEET: ADD NEW ACCOUNT
         ======================================================== */}
      {addModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
          {/* Backdrop click to dismiss */}
          <div className="absolute inset-0" onClick={() => setAddModal(false)} />

          <div className="relative bg-white rounded-t-[32px] sm:rounded-3xl w-full max-w-md p-5 sm:p-7 shadow-2xl max-h-[92dvh] overflow-y-auto animate-slide-up z-10 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Add Split Account</h2>
                <p className="text-xs text-gray-500">Create a register, bank, or UPI account</p>
              </div>
              <button
                type="button"
                onClick={() => setAddModal(false)}
                className="p-2.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Account Name *
                </label>
                <Input
                  placeholder="e.g. Main Register, Petty Cash, HDFC Bank"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="rounded-2xl h-12 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Account Type *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CASH', 'BANK', 'UPI', 'OTHER'] as const).map((type) => {
                    const m = ACCOUNT_TYPE_META[type]
                    const Icon = m.icon
                    const isSelected = newAccType === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewAccType(type)}
                        className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all active:scale-95 ${
                          isSelected
                            ? 'border-[#8b5a2b] bg-[#f4e8d8] shadow-sm'
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-[#8b5a2b]' : m.color}`} />
                        <span className={`text-[11px] font-extrabold ${isSelected ? 'text-[#8b5a2b]' : 'text-gray-600'}`}>
                          {type}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Opening Balance (₹)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-lg font-bold text-gray-400">₹</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={newAccOpening}
                    onChange={(e) => setNewAccOpening(e.target.value)}
                    className="rounded-2xl pl-9 h-12 text-base font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-2xl h-13 font-bold text-sm"
                onClick={() => setAddModal(false)}
                disabled={addAccountMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-2xl h-13 bg-[#8b5a2b] hover:bg-[#6b4423] text-white font-extrabold text-sm shadow-md active:scale-98 transition-all"
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

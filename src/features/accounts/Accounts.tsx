import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Landmark, ArrowUpRight, ArrowDownRight, Plus, History, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export function Accounts() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT')
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')

  // 1. Fetch the main account
  const { data: account, isLoading: isLoadingAccount } = useQuery({
    queryKey: ['store_account'],
    queryFn: async () => {
      let { data, error } = await (supabase as any)
        .from('store_accounts')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    }
  })

  // 2. Fetch ledger history
  
  const { data: outstandingBalance = 0 } = useQuery({
    queryKey: ['outstanding_balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total')
        .eq('payment_status', 'PENDING')
      
      if (error) throw error
      return data.reduce((sum, order: any) => sum + Number(order.total || 0), 0)
    }
  })

  const { data: transactions, isLoading: isLoadingTx } = useQuery({
    queryKey: ['account_transactions', account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_transactions')
        .select(`
          *,
          profiles ( full_name )
        `)
        .eq('account_id', account.id)
        .order('created_at', { ascending: false })
        
      if (error) throw error
      return data as any[]
    }
  })

  // 3. Process Transaction Mutation (Calls our RPC)
  const processTxMutation = useMutation({
    mutationFn: async () => {
      if (!account) throw new Error("No account found")
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) throw new Error("Invalid amount")
      if (!remarks.trim()) throw new Error("Remarks are required")

      const { data, error } = await (supabase as any).rpc('process_transaction', {
        p_account_id: account.id,
        p_type: modalType,
        p_amount: Number(amount),
        p_remarks: remarks,
        p_user_id: profile?.id || null
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success(`${modalType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} successful!`)
      queryClient.invalidateQueries({ queryKey: ['store_account'] })
      queryClient.invalidateQueries({ queryKey: ['account_transactions'] })
      setIsModalOpen(false)
      setAmount('')
      setRemarks('')
    },
    onError: (err: any) => {
      toast.error(err.message || "Transaction failed")
    }
  })

  // Handle initialization of the first account if it doesn't exist
  
  const deleteTxMutation = useMutation({
    mutationFn: async (txId: string) => {
      const { error } = await (supabase as any).rpc('reverse_transaction', { p_transaction_id: txId })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Transaction reversed and deleted')
      queryClient.invalidateQueries({ queryKey: ['store_account'] })
      queryClient.invalidateQueries({ queryKey: ['account_transactions'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to reverse transaction')
  })
  
  const initAccountMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('store_accounts')
        .insert([{ name: 'Main Register', balance: 0 }] as any)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_account'] })
      toast.success('Account Initialized!')
    }
  })

  const handleOpenModal = (type: 'DEPOSIT' | 'WITHDRAWAL') => {
    setModalType(type)
    setIsModalOpen(true)
    setAmount('')
    setRemarks('')
  }

  if (isLoadingAccount) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent"></div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-20">
        <Landmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Ledger Found</h2>
        <p className="text-gray-500 mb-6">Initialize your first store account to start tracking cash flow.</p>
        <Button onClick={() => initAccountMutation.mutate()} disabled={initAccountMutation.isPending} className="bg-[#8b5a2b]">
          <Plus className="w-4 h-4 mr-2" />
          Initialize Main Register
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center">
            Accounts <Landmark className="inline h-8 w-8 text-[#8b5a2b] ml-2" />
          </h1>
          <p className="text-gray-500 mt-1">Manage cash flow, deposits, and withdrawals.</p>
        </div>
      </header>

      {/* Balance Card */}
      <Card className="border-none shadow-md bg-gradient-to-br from-[#8b5a2b] to-[#6b4423] text-white">
        <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-orange-200/80 font-medium mb-1 uppercase tracking-wider text-sm">{account.name} Balance</p>
            <div className="text-5xl font-bold">
              ₹{Number(account.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            {true && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex justify-between items-center text-orange-100 text-sm mb-1">
                  <span>Outstanding (To Receive)</span>
                  <span className="font-medium">+ ₹{outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-white font-bold">
                  <span>Total Expected Assets</span>
                  <span>₹{(Number(account.balance) + outstandingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Button 
              onClick={() => handleOpenModal('WITHDRAWAL')}
              variant="outline" 
              className="flex-1 md:flex-none border-white/20 hover:bg-white/10 text-black hover:text-white"
            >
              <ArrowDownRight className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
            <Button 
              onClick={() => handleOpenModal('DEPOSIT')}
              className="flex-1 md:flex-none bg-green-500 hover:bg-green-600 border-none text-white shadow-lg shadow-green-900/20"
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Deposit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ledger History */}
      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-gray-50">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingTx ? (
            <div className="p-8 text-center text-gray-500">Loading history...</div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No transactions found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map(tx => (
                <div key={tx.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      tx.type === 'DEPOSIT' || tx.type === 'INITIAL' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {tx.type === 'WITHDRAWAL' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{tx.remarks}</p>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                        <span>{format(new Date(tx.created_at), 'MMM d, h:mm a')}</span>
                        <span>•</span>
                        <span>By {tx.profiles?.full_name || 'System'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-lg font-bold ${
                      tx.type === 'DEPOSIT' || tx.type === 'INITIAL' ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {tx.type === 'WITHDRAWAL' ? '-' : '+'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    {new Date().getTime() - new Date(tx.created_at).getTime() < 24 * 60 * 60 * 1000 && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this transaction? This will automatically reverse the balance.')) {
                            deleteTxMutation.mutate(tx.id)
                          }
                        }}
                        disabled={deleteTxMutation.isPending}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete (available for 24h)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {modalType === 'DEPOSIT' ? 'Deposit Funds' : 'Withdraw Funds'}
            </h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="text-lg font-semibold"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks *</label>
                <Input 
                  type="text"
                  placeholder={modalType === 'DEPOSIT' ? 'e.g., End of day cash addition' : 'e.g., Vendor payment for milk'}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsModalOpen(false)}
                disabled={processTxMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                className={`flex-1 text-white ${
                  modalType === 'DEPOSIT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={() => processTxMutation.mutate()}
                disabled={processTxMutation.isPending}
              >
                {processTxMutation.isPending ? 'Processing...' : `Confirm ${modalType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

export function CustomerForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      notes: ''
    }
  })

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('customers')
        .insert([
          {
            name: data.name.trim(),
            phone: data.phone?.trim() || null,
            email: data.email?.trim() || null,
            notes: data.notes?.trim() || null,
          }
        ] as any)

      if (insertError) throw insertError
      
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_customers'] })
      
      // Navigate back on success
      navigate('/customers')
    } catch (err: any) {
      console.error('Error creating customer:', err)
      setError(err.message || 'Failed to create customer')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5 sm:space-y-6">
      <div className="flex items-center gap-3">
        <button 
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 active:scale-95 rounded-full transition-all text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900">Add New Customer</h1>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-7">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Customer Name *
            </label>
            <Input 
              {...register('name')}
              placeholder="e.g. Rahul Sharma" 
              className={`rounded-2xl h-12 text-sm ${errors.name ? 'border-red-500' : ''}`}
              autoFocus
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Phone Number
            </label>
            <Input 
              {...register('phone')}
              type="tel"
              inputMode="tel"
              placeholder="e.g. 9876543210" 
              className="rounded-2xl h-12 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Email Address
            </label>
            <Input 
              {...register('email')}
              type="email"
              inputMode="email"
              placeholder="e.g. rahul@example.com" 
              className={`rounded-2xl h-12 text-sm ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Notes & Preferences
            </label>
            <textarea 
              {...register('notes')}
              rows={3}
              className="flex w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Any special preferences, allergy notes or credit terms..."
            />
          </div>

          <div className="pt-3 flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 rounded-2xl h-12 font-bold text-sm"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 rounded-2xl h-12 bg-[#8b5a2b] hover:bg-[#6b4423] text-white font-extrabold text-sm shadow-md active:scale-98 transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

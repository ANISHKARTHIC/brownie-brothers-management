import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be 0 or greater'),
})

type ProductFormValues = z.infer<typeof productSchema>

export function ProductForm() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0
    }
  })

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Insert the main product
      const { data: responseData, error: productError } = await supabase
        .from('products')
        .insert([
          {
            name: data.name,
            description: data.description || null,
            is_active: true
          }
        ] as any)
        .select()
        .single()
        
      const productData = responseData as any

      if (productError) throw productError
      if (!productData) throw new Error("Failed to insert product")

      // 2. Insert the default variant
      const { error: variantError } = await supabase
        .from('product_variants')
        .insert([
          {
            product_id: productData.id,
            name: 'Regular',
            price: data.price,
            is_active: true
          }
        ] as any)

      if (variantError) throw variantError
      
      // Navigate back on success
      navigate('/products')
    } catch (err: any) {
      console.error('Error creating product:', err)
      setError(err.message || 'Failed to create product')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <Input 
              {...register('name')}
              placeholder="e.g. Classic Fudge Brownie" 
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Price (₹) *
            </label>
            <Input 
              type="number"
              step="0.01"
              {...register('price', { valueAsNumber: true })}
              placeholder="e.g. 150" 
              className={errors.price ? 'border-red-500' : ''}
            />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea 
              {...register('description')}
              rows={4}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8b5a2b] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Rich, gooey chocolate fudge brownie..."
            />
          </div>

          <div className="pt-4 flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-[#8b5a2b] hover:bg-[#6b4423]"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

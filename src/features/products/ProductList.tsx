import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, Plus, Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import type { Database } from '@/types/database.types'

type Product = Database['public']['Tables']['products']['Row']
type ProductVariant = Database['public']['Tables']['product_variants']['Row']

interface ProductWithVariants extends Product {
  variants: ProductVariant[]
}

export function ProductList() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          variants:product_variants(*)
        `)
        .order('created_at', { ascending: false })

      if (debouncedSearch) {
        query = query.ilike('name', `%${debouncedSearch}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as ProductWithVariants[]
    }
  })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage your catalog and variants.</p>
        </div>
        <Button onClick={() => navigate('/products/new')} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input 
          placeholder="Search products..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32 p-6"></CardContent>
            </Card>
          ))}
        </div>
      ) : products?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products?.map((product) => (
            <Card 
              key={product.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${!product.is_active ? 'opacity-60' : ''}`}
              onClick={() => navigate(`/products/${product.id}`)}
            >
              <div className="flex h-32 w-full items-center justify-center bg-gray-100">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-gray-300" />
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                  </div>
                  {!product.is_active && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                      Inactive
                    </span>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Variants</p>
                  <div className="space-y-2">
                    {product.variants?.map(variant => (
                      <div key={variant.id} className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">{variant.name}</span>
                        <span className="font-medium">₹{variant.price}</span>
                      </div>
                    ))}
                    {(!product.variants || product.variants.length === 0) && (
                      <p className="text-sm text-gray-400 italic">No variants</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

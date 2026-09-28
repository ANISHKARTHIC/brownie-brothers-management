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
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {products?.map((product) => (
            <Card 
              key={product.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${!product.is_active ? 'opacity-60' : ''}`}
              onClick={() => navigate(`/products/${product.id}`)}
            >
              <div className="flex p-4 gap-4">
                <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 truncate text-base sm:text-lg">{product.name}</h3>
                    {!product.is_active && (
                      <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 uppercase tracking-wider">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{product.description || 'No description'}</p>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.variants?.slice(0, 3).map((v: any) => (
                      <div key={v.id} className="bg-orange-50 text-[#8b5a2b] border border-orange-100 px-2 py-1 rounded-md text-xs font-medium flex gap-2">
                        <span>{v.name}</span>
                        <span className="font-bold">₹{v.price}</span>
                      </div>
                    ))}
                    {product.variants && product.variants.length > 3 && (
                      <div className="bg-gray-50 text-gray-500 border border-gray-200 px-2 py-1 rounded-md text-xs font-medium">
                        +{product.variants.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

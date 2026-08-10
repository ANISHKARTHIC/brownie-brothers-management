import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, Edit2, Save, X, Plus, Package, DollarSign, Archive, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export function ProductDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [isEditingProduct, setIsEditingProduct] = useState(false)
  const [productForm, setProductForm] = useState({ name: '', description: '', is_active: true })
  
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)
  const [variantForm, setVariantForm] = useState({ name: '', price: 0, is_active: true })
  const [isAddingVariant, setIsAddingVariant] = useState(false)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_variants (*)
        `)
        .eq('id', id!)
        .single()

      if (error) throw error
      return data as any
    },
    enabled: !!id
  })

  useEffect(() => {
    if (product) {
      setProductForm({
        name: product.name,
        description: product.description || '',
        is_active: product.is_active
      })
    }
  }, [product])

  const updateProductMutation = useMutation({
    mutationFn: async (newData: typeof productForm) => {
      const { error } = await (supabase as any)
        .from('products')
        .update(newData)
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsEditingProduct(false)
    }
  })

  const saveVariantMutation = useMutation({
    mutationFn: async () => {
      if (editingVariantId) {
        const { error } = await (supabase as any)
          .from('product_variants')
          .update(variantForm)
          .eq('id', editingVariantId)
        if (error) throw error
      } else if (isAddingVariant) {
        const { error } = await (supabase as any)
          .from('product_variants')
          .insert([{ ...variantForm, product_id: id! }])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      setEditingVariantId(null)
      setIsAddingVariant(false)
    }
  })

  const toggleVariantStatusMutation = useMutation({
    mutationFn: async ({ vid, is_active }: { vid: string, is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('product_variants')
        .update({ is_active })
        .eq('id', vid)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] })
    }
  })

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Product not found.</p>
        <Button onClick={() => navigate('/products')} className="mt-4">Back to Products</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Product Details</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Product Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#8b5a2b]" />
                  Basic Info
                </h3>
                {!isEditingProduct && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingProduct(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {isEditingProduct ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <Input 
                      value={productForm.name}
                      onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <textarea 
                      className="w-full min-h-[80px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5a2b]"
                      value={productForm.description}
                      onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <button 
                      className={`text-sm px-3 py-1 rounded-full font-medium ${productForm.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                      onClick={() => setProductForm({...productForm, is_active: !productForm.is_active})}
                    >
                      {productForm.is_active ? 'Active' : 'Archived'}
                    </button>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1 bg-[#8b5a2b] hover:bg-[#6b4423]"
                      onClick={() => updateProductMutation.mutate(productForm)}
                      disabled={updateProductMutation.isPending}
                    >
                      Save
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-none"
                      onClick={() => setIsEditingProduct(false)}
                      disabled={updateProductMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 mt-2 text-xs font-medium ring-1 ring-inset ${
                      product.is_active ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-gray-50 text-gray-700 ring-gray-600/20'
                    }`}>
                      {product.is_active ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  {product.description && (
                    <p className="text-sm text-gray-600 border-t pt-4">
                      {product.description}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Variants */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">Pricing & Variants</h3>
                </div>
                {!isAddingVariant && (
                  <Button 
                    size="sm" 
                    className="bg-[#8b5a2b] hover:bg-[#6b4423]"
                    onClick={() => {
                      setVariantForm({ name: '', price: 0, is_active: true })
                      setIsAddingVariant(true)
                      setEditingVariantId(null)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Variant
                  </Button>
                )}
              </div>

              <div className="p-4 space-y-4">
                {/* Add/Edit Form Inline */}
                {(isAddingVariant || editingVariantId) && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-4 mb-4">
                    <h4 className="font-medium text-orange-800">{isAddingVariant ? 'New Variant' : 'Edit Variant'}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-orange-800 mb-1 block">Variant Name</label>
                        <Input 
                          placeholder="e.g. Box of 6" 
                          value={variantForm.name}
                          onChange={(e) => setVariantForm({...variantForm, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-orange-800 mb-1 block">Price (₹)</label>
                        <Input 
                          type="number"
                          placeholder="0.00" 
                          value={variantForm.price || ''}
                          onChange={(e) => setVariantForm({...variantForm, price: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => saveVariantMutation.mutate()}>
                        <Save className="h-4 w-4 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-100" onClick={() => {
                        setIsAddingVariant(false)
                        setEditingVariantId(null)
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* List Variants */}
                <div className="divide-y border rounded-xl overflow-hidden">
                  {product.product_variants?.sort((a: any, b: any) => a.price - b.price).map((variant: any) => (
                    <div key={variant.id} className={`p-4 flex items-center justify-between ${variant.is_active ? 'bg-white' : 'bg-gray-50 opacity-75'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{variant.name}</p>
                          {!variant.is_active && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Archived</span>
                          )}
                        </div>
                        <p className="text-gray-600 font-medium mt-1">₹{variant.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setVariantForm({ name: variant.name, price: variant.price, is_active: variant.is_active })
                            setEditingVariantId(variant.id)
                            setIsAddingVariant(false)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={variant.is_active ? "text-red-600 hover:bg-red-50 hover:text-red-700" : "text-green-600 hover:bg-green-50 hover:text-green-700"}
                          onClick={() => toggleVariantStatusMutation.mutate({ vid: variant.id, is_active: !variant.is_active })}
                          title={variant.is_active ? "Archive Variant" : "Activate Variant"}
                        >
                          {variant.is_active ? <Archive className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {product.product_variants?.length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                      No variants found. Add one to sell this product.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

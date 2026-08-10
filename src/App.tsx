import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { Login } from '@/features/auth/Login'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { CustomerList } from '@/features/customers/CustomerList'
import { ProductList } from '@/features/products/ProductList'
import { OrderList } from '@/features/orders/OrderList'
import { MoreMenu } from '@/features/settings/MoreMenu'

import { CustomerForm } from '@/features/customers/CustomerForm'
import { ProductForm } from '@/features/products/ProductForm'
import { OrderForm } from '@/features/orders/OrderForm'

const queryClient = new QueryClient()

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth()
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5a2b] border-t-transparent"></div>
      </div>
    )
  }
  
  if (!session) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<OrderList />} />
              <Route path="orders/new" element={<OrderForm />} />
              <Route path="customers" element={<CustomerList />} />
              <Route path="customers/new" element={<CustomerForm />} />
              <Route path="products" element={<ProductList />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="more" element={<MoreMenu />} />
              {/* Feature routes will go here */}
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { Login } from '@/features/auth/Login'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { CustomerList } from '@/features/customers/CustomerList'
import { ProductList } from '@/features/products/ProductList'
import { InventoryList } from '@/features/inventory/InventoryList'
import { Toaster } from 'react-hot-toast'
import { OrderList } from '@/features/orders/OrderList'
import { OrderForm } from '@/features/orders/OrderForm'
import { OrderDetails } from '@/features/orders/OrderDetails'
import { MoreMenu } from '@/features/settings/MoreMenu'
import { ComingSoon } from '@/components/layout/ComingSoon'
import { PreparationBoard } from '@/features/production/PreparationBoard'

import { CustomerForm } from '@/features/customers/CustomerForm'
import { CustomerDetails } from '@/features/customers/CustomerDetails'
import { ProductForm } from '@/features/products/ProductForm'
import { ProductDetails } from '@/features/products/ProductDetails'

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
      <Toaster position="top-center" />
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
              <Route path="orders/:id" element={<OrderDetails />} />
              <Route path="customers" element={<CustomerList />} />
              <Route path="customers/new" element={<CustomerForm />} />
              <Route path="customers/:id" element={<CustomerDetails />} />
              <Route path="products" element={<ProductList />} />
              <Route path="inventory" element={<InventoryList />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/:id" element={<ProductDetails />} />
              <Route path="more" element={<MoreMenu />} />
              
              <Route path="production" element={<PreparationBoard />} />
              <Route path="payments" element={<ComingSoon title="Payments" />} />
              <Route path="deliveries" element={<ComingSoon title="Deliveries" />} />
              <Route path="expenses" element={<ComingSoon title="Expenses" />} />
              <Route path="reports" element={<ComingSoon title="Reports" />} />
              <Route path="staff" element={<ComingSoon title="Staff Management" />} />
              <Route path="settings" element={<ComingSoon title="Settings" />} />

            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

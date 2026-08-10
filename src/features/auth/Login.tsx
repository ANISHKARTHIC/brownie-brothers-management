import React, { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  })

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError(null)
    reset()
  }

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError(null)
    
    if (isSignUp) {
      // Handle Sign Up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName || 'New User',
          }
        }
      })

      if (signUpError) {
        setError(signUpError.message)
      } else if (signUpData.user?.identities?.length === 0) {
        setError("This email is already registered. Please sign in instead.")
      } else if (signUpData.user) {
        // Automatically insert a profile for the new user as OWNER for testing purposes
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: signUpData.user.id, 
              role: 'OWNER', 
              full_name: data.fullName || 'New User' 
            }
          ])
          
        if (profileError) {
          console.error("Profile creation error:", profileError)
          // Don't block the UI for profile errors during dev
        }
        
        setError("Account created! If you have 'Confirm email' enabled in Supabase, please check your inbox. Otherwise, you can now sign in.")
        // Switch to sign in mode
        setIsSignUp(false)
      }
    } else {
      // Handle Sign In
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) {
        setError(signInError.message)
      }
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center p-6">
      <div className="w-full max-w-md mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="text-4xl mb-4">🍫</div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Brownie Business
          </h1>
          <p className="text-gray-500">
            {isSignUp ? 'Create a new account.' : 'Manage your business from anywhere.'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className={`p-3 text-sm rounded-xl ${error.includes('Account created') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {isSignUp && (
              <Input
                label="Full Name"
                type="text"
                placeholder="Jane Doe"
                autoComplete="name"
                error={errors.fullName?.message}
                {...register('fullName')}
              />
            )}
            
            <Input
              label="Email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            
            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                error={errors.password?.message}
                {...register('password')}
              />
              {!isSignUp && (
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    className="text-sm font-medium text-[#8b5a2b] hover:text-[#7a4e25]"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            isLoading={isLoading}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

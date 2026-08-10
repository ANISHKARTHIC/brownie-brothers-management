import React from 'react'
import { cn } from '@/lib/utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-[#8b5a2b] text-white hover:bg-[#7a4e25] shadow-sm',
      secondary: 'bg-[#f4e8d8] text-[#8b5a2b] hover:bg-[#e8d5bc]',
      outline: 'border-2 border-[#8b5a2b] text-[#8b5a2b] hover:bg-[#f4e8d8]',
      ghost: 'text-[#8b5a2b] hover:bg-black/5',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    }

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-11 px-4 py-2 min-w-[44px]', // 44px min height for touch targets
      lg: 'h-14 px-8 text-lg',
      icon: 'h-11 w-11 flex items-center justify-center p-0',
    }

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5a2b] disabled:pointer-events-none disabled:opacity-50 active:scale-95',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg className="mr-2 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

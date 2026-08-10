export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'OWNER' | 'MANAGER' | 'STAFF' | 'PRODUCTION' | 'DELIVERY'
          full_name: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'OWNER' | 'MANAGER' | 'STAFF' | 'PRODUCTION' | 'DELIVERY'
          full_name: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'OWNER' | 'MANAGER' | 'STAFF' | 'PRODUCTION' | 'DELIVERY'
          full_name?: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          category_id: string | null
          name: string
          description: string | null
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          description?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          name: string
          price: number
          weight_g: number | null
          sku: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          name: string
          price?: number
          weight_g?: number | null
          sku?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          name?: string
          price?: number
          weight_g?: number | null
          sku?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // TODO: Add full table types as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'OWNER' | 'MANAGER' | 'STAFF' | 'PRODUCTION' | 'DELIVERY'
      order_status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
      payment_status: 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED'
      payment_method: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'
      delivery_type: 'PICKUP' | 'DELIVERY'
      inventory_category: 'INGREDIENT' | 'PACKAGING' | 'FINISHED_PRODUCT'
      inventory_transaction_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'WASTAGE'
      batch_status: 'PENDING' | 'PREPARING' | 'COMPLETED'
      delivery_status: 'PENDING' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED'
    }
  }
}

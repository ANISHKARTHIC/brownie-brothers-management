import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Get current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load env vars
dotenv.config({ path: resolve(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createUser() {
  const email = 'owner@browniebusiness.com'
  const password = 'securepassword123'
  
  console.log(`Creating user: ${email}...`)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Business Owner',
      }
    }
  })
  
  if (error) {
    console.error('Error creating user:', error.message)
    return
  }
  
  console.log('Successfully created user!')
  console.log('Email:', email)
  console.log('Password:', password)
  
  if (data.user) {
    console.log('User ID:', data.user.id)
    
    // Attempt to insert profile directly if RLS allows it (usually requires trigger or service_role, 
    // but we'll try with the anon key since we might have an active session for this new user)
    // Actually, sign up with anon key logs the user in on the client side, but in a node environment it might not maintain the session automatically.
    // The SQL schema we created didn't include an automatic trigger to create a profile on user sign up.
    // Let's create the profile. We'll sign in first just in case.
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (signInError) {
      console.log('Could not sign in to create profile:', signInError.message)
      return
    }
    
    console.log('Creating profile...')
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: data.user.id, 
          role: 'OWNER', 
          full_name: 'Business Owner' 
        }
      ])
      
    if (profileError) {
      console.error('Error creating profile:', profileError.message)
      console.log('Note: If you have RLS enabled, you might need a service_role key to insert the profile, or you should set up a database trigger on auth.users.')
    } else {
      console.log('Profile created successfully!')
    }
  }
}

createUser()

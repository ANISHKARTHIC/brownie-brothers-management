import { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User, Lock, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export function Settings() {
  const { profile, session } = useAuth()
  
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [isPinEnabled, setIsPinEnabled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone(profile.phone || '')
    }
    const pinState = localStorage.getItem('brownie_pin_enabled')
    setIsPinEnabled(pinState === 'true')
  }, [profile])

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return
    setIsSaving(true)
    
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)

      if (error) throw error
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const togglePin = () => {
    const newState = !isPinEnabled
    setIsPinEnabled(newState)
    localStorage.setItem('brownie_pin_enabled', newState.toString())
    
    if (newState) {
      toast.success('PIN lock enabled for this device')
      // If no PIN exists yet, it will prompt them on next load
      if (!localStorage.getItem('brownie_pin')) {
        toast('You will be prompted to create a PIN next time you open the app.', { icon: 'ℹ️' })
      }
    } else {
      toast.success('PIN lock disabled')
    }
  }

  const resetPin = () => {
    localStorage.removeItem('brownie_pin')
    toast.success('PIN reset. You will be prompted to create a new one.')
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account profile and device security.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <Input 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <Input 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role (Read-only)</label>
              <Input 
                value={profile?.role || 'STAFF'}
                disabled
                className="bg-gray-50 text-gray-500 font-semibold"
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full bg-[#8b5a2b] hover:bg-[#6b4423]">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-6 h-fit">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Device Security</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Require PIN on Startup</p>
                <p className="text-sm text-gray-500">Lock the app when opened on this device.</p>
              </div>
              <button 
                onClick={togglePin}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${isPinEnabled ? 'bg-green-500' : 'bg-gray-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isPinEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            
            {isPinEnabled && (
              <div className="pt-4 border-t">
                <Button onClick={resetPin} variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                  Reset PIN
                </Button>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Clicking this will force you to set up a new PIN next time you open the app.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

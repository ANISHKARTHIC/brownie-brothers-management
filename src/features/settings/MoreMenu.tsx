import { useAuth } from '@/features/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Factory, 
  CreditCard, 
  Truck, 
  Receipt, 
  BarChart3, 
  UsersRound, 
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

export function MoreMenu() {
  const { profile, signOut } = useAuth()

  const menuItems = [
    { name: 'Production', path: '/production', icon: Factory, roles: ['OWNER', 'MANAGER', 'PRODUCTION'] },
    { name: 'Payments', path: '/payments', icon: CreditCard, roles: ['OWNER', 'MANAGER'] },
    { name: 'Deliveries', path: '/deliveries', icon: Truck, roles: ['OWNER', 'MANAGER', 'DELIVERY'] },
    { name: 'Expenses', path: '/expenses', icon: Receipt, roles: ['OWNER', 'MANAGER'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['OWNER', 'MANAGER'] },
    { name: 'Staff', path: '/staff', icon: UsersRound, roles: ['OWNER'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['OWNER', 'MANAGER'] },
  ]

  // Filter items based on user role
  const visibleItems = menuItems.filter(item => 
    !profile?.role || item.roles.includes(profile.role)
  )

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">More</h1>
        <p className="text-sm text-gray-500">Manage business operations and settings.</p>
      </header>

      <div className="space-y-4">
        {/* Profile Card */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-[#f4e8d8] flex items-center justify-center text-[#8b5a2b] font-bold text-lg">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{profile?.full_name}</h3>
                <p className="text-sm text-gray-500 capitalize">{profile?.role?.toLowerCase() || 'Staff'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Grid/List */}
        <Card>
          <div className="divide-y divide-gray-100">
            {visibleItems.map(item => (
              <NavLink 
                key={item.name}
                to={item.path}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-xl bg-gray-50 text-gray-600">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </NavLink>
            ))}
          </div>
        </Card>
        
        {/* Sign Out Button */}
        <div className="pt-4 pb-8">
          <Button 
            variant="outline" 
            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}

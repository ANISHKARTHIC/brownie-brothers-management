import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import {
  ClipboardList,
  Cookie,
  Package,
  ChefHat,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Truck,
  Receipt,
  UsersRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const MENU_SECTIONS = [
  {
    title: 'Operations',
    items: [
      { name: 'Orders', path: '/orders', icon: ClipboardList, color: 'bg-orange-50 text-orange-600', description: 'View and manage orders' },
      { name: 'Products', path: '/products', icon: Cookie, color: 'bg-amber-50 text-amber-600', description: 'Manage your product catalog' },
      { name: 'Inventory', path: '/inventory', icon: Package, color: 'bg-blue-50 text-blue-600', description: 'Track stock levels' },
      { name: 'Prep Board', path: '/production', icon: ChefHat, color: 'bg-purple-50 text-purple-600', description: 'Kitchen preparation board' },
    ],
  },
  {
    title: 'Business',
    items: [
      { name: 'Reports', path: '/reports', icon: BarChart3, color: 'bg-green-50 text-green-600', description: 'Sales and analytics' },
      { name: 'Deliveries', path: '/deliveries', icon: Truck, color: 'bg-sky-50 text-sky-600', description: 'Delivery management' },
      { name: 'Expenses', path: '/expenses', icon: Receipt, color: 'bg-rose-50 text-rose-600', description: 'Track business expenses' },
      { name: 'Staff', path: '/staff', icon: UsersRound, color: 'bg-indigo-50 text-indigo-600', description: 'Manage your team' },
    ],
  },
  {
    title: 'System',
    items: [
      { name: 'Settings', path: '/settings', icon: Settings, color: 'bg-gray-100 text-gray-600', description: 'App preferences' },
    ],
  },
]

export function MoreMenu() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Profile Banner */}
      <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="h-14 w-14 rounded-2xl bg-[#f4e8d8] flex items-center justify-center text-[#8b5a2b] font-bold text-2xl flex-shrink-0">
          {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg leading-tight">{profile?.full_name}</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f4e8d8] text-[#8b5a2b] capitalize mt-1">
            {profile?.role?.toLowerCase() || 'Staff'}
          </span>
        </div>
      </div>

      {/* Menu Sections */}
      {MENU_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">
            {section.title}
          </p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {section.items.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50/80 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Sign Out */}
      <div className="pb-4">
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200 rounded-2xl py-3 font-semibold"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}

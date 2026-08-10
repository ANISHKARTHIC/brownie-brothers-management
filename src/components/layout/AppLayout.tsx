import { Outlet, NavLink } from 'react-router-dom'
import { Home, ClipboardList, Package, Users, Menu } from 'lucide-react'

export function AppLayout() {
  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Orders', path: '/orders', icon: ClipboardList },
    { name: 'Stock', path: '/products', icon: Package },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'More', path: '/more', icon: Menu },
  ]

  return (
    <div className="flex h-screen w-full flex-col bg-[#fafafa] md:flex-row">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden w-64 flex-col border-r bg-white md:flex">
        <div className="flex h-16 items-center px-6 text-xl font-bold text-[#8b5a2b]">
          🍫 Brownie
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#f4e8d8] text-[#8b5a2b]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t bg-white pb-safe md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center space-y-1 ${
                isActive ? 'text-[#8b5a2b]' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

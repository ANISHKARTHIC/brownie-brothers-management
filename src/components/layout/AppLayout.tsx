import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, Landmark, Users, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function AppLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  // Scroll to top whenever route changes to prevent blank view caused by retained scroll offset
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
    window.scrollTo(0, 0)
  }, [location.pathname])

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Accounts', path: '/accounts', icon: Landmark },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'More', path: '/more', icon: MoreHorizontal },
  ]

  return (
    <div className="flex h-screen w-full flex-col bg-[#fafaf9] md:flex-row overflow-hidden">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden w-64 flex-col border-r border-gray-100 bg-white md:flex shadow-sm flex-shrink-0">
        <div className="flex h-16 items-center px-6 text-xl font-bold text-[#8b5a2b] gap-2.5">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-8 w-8 object-contain rounded-lg"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          Brownie Brothers
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#f4e8d8] text-[#8b5a2b] shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium px-4">Brownie Brothers © 2026</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        ref={mainRef}
        className="flex-1 min-h-0 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8 pt-[env(safe-area-inset-top)]"
      >
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-gray-200/80 bg-white/95 backdrop-blur-md md:hidden items-center justify-around px-2 pt-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] min-h-[calc(4.5rem+env(safe-area-inset-bottom))] shadow-lg">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center py-1 rounded-xl mx-1 transition-all duration-200 ${
                isActive ? 'text-[#8b5a2b]' : 'text-gray-400 hover:text-gray-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1.5 rounded-xl transition-all duration-200 ${
                    isActive ? 'bg-[#f4e8d8] text-[#8b5a2b]' : 'text-gray-500'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-[10px] font-semibold tracking-tight mt-0.5 ${
                    isActive ? 'text-[#8b5a2b]' : 'text-gray-500'
                  }`}
                >
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

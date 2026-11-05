import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, Landmark, Boxes, Users, MoreHorizontal } from 'lucide-react'
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
    { name: 'Stock', path: '/stock', icon: Boxes },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'More', path: '/more', icon: MoreHorizontal },
  ]

  return (
    <div className="flex h-screen w-full flex-col bg-[#f8f5f1] md:flex-row overflow-hidden">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden w-72 flex-col border-r border-[#eadfd4] bg-[#fffdfa] md:flex shadow-[4px_0_24px_rgba(74,45,24,0.03)] flex-shrink-0">
        <div className="flex h-20 items-center px-7 text-xl font-bold text-[#6b4423] gap-3">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-9 w-9 object-contain rounded-xl"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          Brownie Brothers
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <p className="px-4 pb-3 text-[10px] font-bold text-[#b8a99d]">Workspace</p>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#f4e8d8] text-[#6b4423] shadow-[inset_3px_0_0_#8b5a2b]'
                    : 'text-[#84766c] hover:bg-[#faf4ee] hover:text-[#3f3027]'
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-5 border-t border-[#f0e7df]">
          <p className="text-xs text-[#b8a99d] font-medium px-3">Brownie Brothers · 2026</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        ref={mainRef}
        className="flex-1 min-h-0 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10 pt-[env(safe-area-inset-top)]"
      >
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-[#eadfd4] bg-[#fffdfa]/95 backdrop-blur-md md:hidden items-center justify-around px-2 pt-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] min-h-[calc(4.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(74,45,24,0.08)]">
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
                  className={`text-[11px] font-semibold tracking-tight mt-0.5 ${
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

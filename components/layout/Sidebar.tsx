'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/context/SidebarContext'

export interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

export default function Sidebar({ navItems, brand = 'Citas SaaS' }: { navItems: NavItem[]; brand?: string }) {
  const pathname = usePathname()
  const { isMobileOpen, closeMobileSidebar } = useSidebar()

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden" onClick={closeMobileSidebar} />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-[260px] flex-col border-r border-gray-200 bg-white px-4 transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 py-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">C</span>
          <span className="text-lg font-semibold text-gray-800">{brand}</span>
        </div>
        <nav className="flex-1 overflow-y-auto no-scrollbar">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMobileSidebar}
                    className={`menu-item group ${active ? 'menu-item-active' : 'menu-item-inactive'}`}
                  >
                    <span className={`h-5 w-5 ${active ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}

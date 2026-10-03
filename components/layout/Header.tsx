'use client'

import { useSidebar } from '@/context/SidebarContext'
import Avatar from '@/components/ui/Avatar'
import { MenuIcon, CloseIcon } from './icons'

export default function Header({
  userName,
  photoUrl,
  signOutAction,
  logoutLabel = 'Déconnexion',
}: {
  userName: string
  photoUrl?: string | null
  signOutAction: () => void
  logoutLabel?: string
}) {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:px-6">
      <button
        type="button"
        onClick={toggleMobileSidebar}
        aria-label="Ouvrir le menu"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 lg:hidden"
      >
        {isMobileOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={userName} photoUrl={photoUrl} size={32} />
          <span className="hidden text-sm text-gray-700 sm:inline">{userName}</span>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="text-sm font-medium text-error-600 hover:text-error-700">
            {logoutLabel}
          </button>
        </form>
      </div>
    </header>
  )
}

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useSidebar } from '@/context/SidebarContext'
import { useOnboardingTour, type OnboardingPageId } from '@/context/OnboardingTourContext'
import Avatar from '@/components/ui/Avatar'
import { MenuIcon, CloseIcon, HelpIcon } from './icons'

// Pages dont le tour niveau 2 est deja implemente, avec une URL fixe (donc rejouable depuis
// n'importe quelle autre page du menu "?") -- 'cita_detalle' et 'paciente_detalle' en sont
// volontairement exclues : ce sont des fiches d'un enregistrement precis (pas d'URL generique vers
// laquelle naviguer), leur tour se redeclenche automatiquement a chaque premiere visite mais ne
// peut pas etre rejoue "a distance" depuis ce menu.
const AVAILABLE_PAGE_TOURS: { id: OnboardingPageId; href: string; navKey: string }[] = [
  { id: 'inicio', href: '/dashboard', navKey: 'home' },
  { id: 'pacientes', href: '/dashboard/patients', navKey: 'patients' },
  { id: 'citas', href: '/dashboard/appointments', navKey: 'appointments' },
  { id: 'ingresos', href: '/dashboard/ingresos', navKey: 'ingresos' },
  { id: 'analisis', href: '/dashboard/analisis', navKey: 'analisis' },
  { id: 'disponibilidad', href: '/dashboard/disponibilidad', navKey: 'disponibilidad' },
  { id: 'configuracion', href: '/dashboard/settings', navKey: 'settings' },
]

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
  const { state, requestTour, setDisabled } = useOnboardingTour()
  const t = useTranslations('dashboard.onboardingTour.common')
  const tPages = useTranslations('dashboard.nav')
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const launchTour = (target: 'sidebar' | OnboardingPageId, href?: string) => {
    setMenuOpen(false)
    requestTour(target)
    // Rejeu depuis une autre page que celle du tour demande -- navigue d'abord, le <PageTour> de
    // la page cible lit tourRequest des son montage (le contexte, lui, survit a la navigation,
    // porte par le layout partage app/dashboard/layout.tsx).
    if (href && href !== pathname) router.push(href)
  }

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
        <div className="relative">
          <button
            type="button"
            data-tour="header-help-button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t('helpButtonLabel')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <HelpIcon className="h-[18px] w-[18px]" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => launchTour('sidebar')}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {t('menuSidebarEntry')}
                </button>
                {AVAILABLE_PAGE_TOURS.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => launchTour(page.id, page.href)}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {t('menuPageEntryPrefix')} {tPages(page.navKey)}
                  </button>
                ))}
                <div className="my-1.5 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setDisabled(!state.disabled)
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {state.disabled ? t('menuEnableAutoTours') : t('menuDisableAutoTours')}
                </button>
              </div>
            </>
          )}
        </div>
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

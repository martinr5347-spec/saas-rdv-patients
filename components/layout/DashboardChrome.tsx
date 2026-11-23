'use client'

import Link from 'next/link'
import { Toaster } from 'react-hot-toast'
import { useTranslations } from 'next-intl'
import type { Step } from 'react-joyride'
import { SidebarProvider } from '@/context/SidebarContext'
import { OnboardingTourProvider, type OnboardingPageId } from '@/context/OnboardingTourContext'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import PageTour from '@/components/onboarding/PageTour'
import { HomeIcon, CalendarIcon, UsersIcon, CashIcon, SettingsIcon, ShieldIcon, TrendingUpIcon, ClockIcon } from '@/components/layout/icons'

export interface OnboardingInitialState {
  sidebarSeen: boolean
  pagesSeen: OnboardingPageId[]
  disabled: boolean
}

// Ne pose plus son propre NextIntlClientProvider local (ancien comportement : locale deduite
// uniquement de users.idioma, es/pt). Le provider global de app/layout.tsx (i18n/request.ts) est
// desormais la seule source de verite -- un provider local ici re-ecraserait silencieusement un
// choix explicite 'fr' du praticien (cookie NEXT_LOCALE) puisque users.idioma ne supporte que es/pt.
export default function DashboardChrome({
  userName,
  photoUrl,
  isAdmin,
  trialDaysLeft,
  signOutAction,
  onboardingInitialState,
  children,
}: {
  userName: string
  photoUrl: string | null
  isAdmin: boolean
  trialDaysLeft: number | null
  signOutAction: () => void
  onboardingInitialState: OnboardingInitialState
  children: React.ReactNode
}) {
  return (
    <OnboardingTourProvider initialState={onboardingInitialState}>
      <DashboardChromeContent userName={userName} photoUrl={photoUrl} isAdmin={isAdmin} trialDaysLeft={trialDaysLeft} signOutAction={signOutAction}>
        {children}
      </DashboardChromeContent>
    </OnboardingTourProvider>
  )
}

function DashboardChromeContent({
  userName,
  photoUrl,
  isAdmin,
  trialDaysLeft,
  signOutAction,
  children,
}: {
  userName: string
  photoUrl: string | null
  isAdmin: boolean
  trialDaysLeft: number | null
  signOutAction: () => void
  children: React.ReactNode
}) {
  const t = useTranslations('dashboard')
  const tTour = useTranslations('dashboard.onboardingTour.sidebar')

  const navItems = [
    { href: '/dashboard', label: t('nav.home'), icon: <HomeIcon />, tourId: 'nav-inicio' },
    { href: '/dashboard/patients', label: t('nav.patients'), icon: <UsersIcon />, tourId: 'nav-pacientes' },
    { href: '/dashboard/appointments', label: t('nav.appointments'), icon: <CalendarIcon />, tourId: 'nav-citas' },
    { href: '/dashboard/ingresos', label: t('nav.ingresos'), icon: <CashIcon />, tourId: 'nav-ingresos' },
    { href: '/dashboard/analisis', label: t('nav.analisis'), icon: <TrendingUpIcon />, tourId: 'nav-analisis' },
    { href: '/dashboard/disponibilidad', label: t('nav.disponibilidad'), icon: <ClockIcon />, tourId: 'nav-disponibilidad' },
    { href: '/dashboard/settings', label: t('nav.settings'), icon: <SettingsIcon />, tourId: 'nav-configuracion' },
    ...(isAdmin ? [{ href: '/admin', label: t('nav.admin'), icon: <ShieldIcon /> }] : []),
  ]

  // Tour niveau 1 (cf. prompt onboarding-tour-guide) -- se joue entierement depuis la sidebar sans
  // navigation reelle, d'ou son montage ici (seul endroit ou la sidebar est montee en permanence).
  const sidebarTourSteps: Step[] = [
    { target: 'body', placement: 'center', content: tTour('welcome') },
    { target: '[data-tour="nav-inicio"]', content: tTour('navInicio') },
    { target: '[data-tour="nav-pacientes"]', content: tTour('navPacientes') },
    { target: '[data-tour="nav-citas"]', content: tTour('navCitas') },
    { target: '[data-tour="nav-ingresos"]', content: tTour('navIngresos') },
    { target: '[data-tour="nav-analisis"]', content: tTour('navAnalisis') },
    { target: '[data-tour="nav-disponibilidad"]', content: tTour('navDisponibilidad') },
    { target: '[data-tour="nav-configuracion"]', content: tTour('navConfiguracion') },
  ]

  return (
    <SidebarProvider>
      <PageTour target="sidebar" steps={sidebarTourSteps} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'var(--font-outfit, sans-serif)',
            fontSize: '13px',
            fontWeight: '500',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            style: {
              background: '#f0fdf4',
              border: '0.5px solid #86efac',
              color: '#15803d',
            },
            iconTheme: { primary: '#15803d', secondary: '#f0fdf4' },
          },
          error: {
            style: {
              background: '#fef2f2',
              border: '0.5px solid #fca5a5',
              color: '#b91c1c',
            },
            iconTheme: { primary: '#b91c1c', secondary: '#fef2f2' },
          },
        }}
      />
      <div className="min-h-screen bg-gray-50">
        <Sidebar navItems={navItems} />
        <div className="lg:pl-[260px]">
          <Header userName={userName} photoUrl={photoUrl} signOutAction={signOutAction} logoutLabel={t('nav.logout')} />
          {trialDaysLeft !== null && (
            <div className="border-b border-brand-100 bg-brand-50">
              <div className="px-4 py-2 text-sm text-brand-700 flex items-center justify-center gap-2 lg:px-6">
                <span>{t('trial.banner', { days: trialDaysLeft })}</span>
                <Link href="/subscribe" className="font-medium underline hover:text-brand-800">
                  {t('trial.upgrade')}
                </Link>
              </div>
            </div>
          )}
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}

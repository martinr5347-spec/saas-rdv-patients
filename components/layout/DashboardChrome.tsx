'use client'

import Link from 'next/link'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { MESSAGES, Locale } from '@/lib/hooks/useLocale'
import { SidebarProvider } from '@/context/SidebarContext'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { HomeIcon, CalendarIcon, UsersIcon, CashIcon, SettingsIcon, ShieldIcon } from '@/components/layout/icons'

export default function DashboardChrome({
  locale,
  userName,
  photoUrl,
  isAdmin,
  trialDaysLeft,
  signOutAction,
  children,
}: {
  locale: Locale
  userName: string
  photoUrl: string | null
  isAdmin: boolean
  trialDaysLeft: number | null
  signOutAction: () => void
  children: React.ReactNode
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <DashboardChromeContent userName={userName} photoUrl={photoUrl} isAdmin={isAdmin} trialDaysLeft={trialDaysLeft} signOutAction={signOutAction}>
        {children}
      </DashboardChromeContent>
    </NextIntlClientProvider>
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

  const navItems = [
    { href: '/dashboard', label: t('nav.home'), icon: <HomeIcon /> },
    { href: '/dashboard/appointments', label: t('nav.appointments'), icon: <CalendarIcon /> },
    { href: '/dashboard/patients', label: t('nav.patients'), icon: <UsersIcon /> },
    { href: '/dashboard/ingresos', label: t('nav.ingresos'), icon: <CashIcon /> },
    { href: '/dashboard/settings', label: t('nav.settings'), icon: <SettingsIcon /> },
    ...(isAdmin ? [{ href: '/admin', label: t('nav.admin'), icon: <ShieldIcon /> }] : []),
  ]

  return (
    <SidebarProvider>
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

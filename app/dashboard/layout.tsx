import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider } from '@/context/SidebarContext'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { HomeIcon, CalendarIcon, UsersIcon, SettingsIcon, ShieldIcon } from '@/components/layout/icons'

async function signOut() {
  'use server'
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('nom, role, organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('statut, trial_ends_at')
    .eq('organization_id', profile?.organization_id ?? '')
    .maybeSingle()

  const trialDaysLeft =
    subscription?.statut === 'trial' && subscription.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : null

  const navItems = [
    { href: '/dashboard', label: 'Accueil', icon: <HomeIcon /> },
    { href: '/dashboard/appointments', label: 'Rendez-vous', icon: <CalendarIcon /> },
    { href: '/dashboard/patients', label: 'Patients', icon: <UsersIcon /> },
    { href: '/dashboard/settings', label: 'Paramètres', icon: <SettingsIcon /> },
    ...(profile?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: <ShieldIcon /> }] : []),
  ]

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar navItems={navItems} />
        <div className="lg:pl-[260px]">
          <Header userName={profile?.nom ?? user?.email ?? ''} signOutAction={signOut} />
          {trialDaysLeft !== null && (
            <div className="border-b border-brand-100 bg-brand-50">
              <div className="px-4 py-2 text-sm text-brand-700 flex items-center justify-center gap-2 lg:px-6">
                <span>
                  Essai gratuit : {trialDaysLeft} {trialDaysLeft > 1 ? 'jours restants' : 'jour restant'}
                </span>
                <Link href="/subscribe" className="font-medium underline hover:text-brand-800">
                  Passer au plan payant
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

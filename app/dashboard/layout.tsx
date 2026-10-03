import { createClient } from '@/lib/supabase/server'
import DashboardChrome from '@/components/layout/DashboardChrome'
import { signOut } from './actions'

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
    .select('nom, role, organization_id, idioma, nombre_completo, foto_url')
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

  return (
    <DashboardChrome
      locale={profile?.idioma === 'pt' ? 'pt' : 'es'}
      userName={profile?.nombre_completo || profile?.nom || user?.email || ''}
      photoUrl={profile?.foto_url ?? null}
      isAdmin={profile?.role === 'admin'}
      trialDaysLeft={trialDaysLeft}
      signOutAction={signOut}
    >
      {children}
    </DashboardChrome>
  )
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-lg">Citas SaaS</span>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                Accueil
              </Link>
              <Link href="/dashboard/appointments" className="text-gray-700 hover:text-blue-600">
                Rendez-vous
              </Link>
              <Link href="/dashboard/patients" className="text-gray-700 hover:text-blue-600">
                Patients
              </Link>
              <Link href="/dashboard/settings" className="text-gray-700 hover:text-blue-600">
                Paramètres
              </Link>
              {profile?.role === 'admin' && (
                <Link href="/admin" className="text-gray-700 hover:text-blue-600">
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">{profile?.nom ?? user?.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-red-600 hover:text-red-800"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      {trialDaysLeft !== null && (
        <div className="bg-blue-50 border-b border-blue-100">
          <div className="max-w-6xl mx-auto px-4 py-2 text-sm text-blue-800 flex items-center justify-center gap-2">
            <span>
              Essai gratuit : {trialDaysLeft} {trialDaysLeft > 1 ? 'jours restants' : 'jour restant'}
            </span>
            <Link href="/subscribe" className="font-medium underline hover:text-blue-900">
              Passer au plan payant
            </Link>
          </div>
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

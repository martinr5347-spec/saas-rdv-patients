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
    .select('nom, role')
    .eq('id', user?.id ?? '')
    .maybeSingle()

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
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider } from '@/context/SidebarContext'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { HomeIcon, ShieldIcon } from '@/components/layout/icons'

async function signOut() {
  'use server'
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('nom')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const navItems = [
    { href: '/dashboard', label: 'Mon cabinet', icon: <HomeIcon /> },
    { href: '/admin', label: 'Admin', icon: <ShieldIcon /> },
  ]

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar navItems={navItems} brand="Núcleo — Admin" />
        <div className="lg:pl-[260px]">
          <Header userName={profile?.nom ?? user?.email ?? ''} signOutAction={signOut} />
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}

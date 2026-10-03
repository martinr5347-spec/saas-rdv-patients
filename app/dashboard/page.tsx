import { createClient } from '@/lib/supabase/server'
import { toTenantParts } from '@/lib/utils/timezone'
import DashboardHomeView from './DashboardHomeView'

function greetingBucket(hour: number): 'morning' | 'afternoon' | 'night' {
  if (hour < 12) return 'morning'
  if (hour < 19) return 'afternoon'
  return 'night'
}

export default async function DashboardHomePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('nom, nombre_completo, organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const { data: organization } = await supabase
    .from('organizations')
    .select('fuseau')
    .eq('id', profile?.organization_id ?? '')
    .maybeSingle()

  const fuseau = organization?.fuseau ?? 'America/Lima'
  const hour = Number(toTenantParts(new Date().toISOString(), fuseau).hour)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, fecha_cita, hora_cita, statut')
    .order('fecha_cita', { ascending: false })
    .limit(5)

  const countsByStatus = (appointments ?? []).reduce(
    (acc, a) => {
      acc[a.statut] = (acc[a.statut] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <DashboardHomeView
      displayName={profile?.nombre_completo || profile?.nom || user?.email || ''}
      greeting={greetingBucket(hour)}
      total={appointments?.length ?? 0}
      pending={countsByStatus['pendiente'] ?? 0}
      paid={countsByStatus['pagado'] ?? 0}
    />
  )
}

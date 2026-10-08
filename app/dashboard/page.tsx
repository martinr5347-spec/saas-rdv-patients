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
    .select('nom, nombre_completo, organization_id, especialidad, foto_url')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const { data: organization } = await supabase
    .from('organizations')
    .select('fuseau, adresse')
    .eq('id', profile?.organization_id ?? '')
    .maybeSingle()

  const { count: patientCount } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', profile?.organization_id ?? '')

  const today = new Date().toISOString().split('T')[0]
  const { count: upcomingCount } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .gte('fecha_cita', today)

  const fuseau = organization?.fuseau ?? 'America/Lima'
  const hour = Number(toTenantParts(new Date().toISOString(), fuseau).hour)

  const onboarding = {
    profileDone: Boolean(profile?.nombre_completo && profile?.especialidad),
    clinicDone: Boolean(organization?.adresse),
    patientDone: (patientCount ?? 0) > 0,
    appointmentDone: (upcomingCount ?? 0) > 0,
  }

  const completedSteps = Object.values(onboarding).filter(Boolean).length
  const totalSteps = 4

  return (
    <DashboardHomeView
      displayName={profile?.nombre_completo || profile?.nom || user?.email || ''}
      greeting={greetingBucket(hour)}
      onboarding={onboarding}
      completedSteps={completedSteps}
      totalSteps={totalSteps}
      upcomingCount={upcomingCount ?? 0}
      patientCount={patientCount ?? 0}
    />
  )
}

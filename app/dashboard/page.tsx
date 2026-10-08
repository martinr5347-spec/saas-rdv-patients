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

  const todayLabelRaw = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date()
  )
  const todayLabel = todayLabelRaw.charAt(0).toUpperCase() + todayLabelRaw.slice(1)

  let todayAppointments: Array<{ id: string; horaCita: string; statut: string; patientName: string }> = []
  let weekStats = { appointments: 0, patients: 0, confirmedPct: 0, deltaVsLastWeek: 0 }

  if (completedSteps === totalSteps) {
    const { data: todayAppts } = await supabase
      .from('appointments')
      .select('id, hora_cita, statut, patient_id')
      .eq('fecha_cita', today)
      .order('hora_cita', { ascending: true })

    const patientIds = (todayAppts ?? []).map((a) => a.patient_id).filter(Boolean)
    const { data: todayPatients } =
      patientIds.length > 0
        ? await supabase.from('patients').select('id, nom').in('id', patientIds)
        : { data: [] as Array<{ id: string; nom: string }> }

    todayAppointments = (todayAppts ?? []).map((a) => ({
      id: a.id,
      horaCita: a.hora_cita,
      statut: a.statut,
      patientName: todayPatients?.find((p) => p.id === a.patient_id)?.nom ?? 'Paciente',
    }))

    const monday = new Date()
    monday.setDate(monday.getDate() - monday.getDay() + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const mondayStr = monday.toISOString().split('T')[0]
    const sundayStr = sunday.toISOString().split('T')[0]

    const { count: weekAppointments } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('fecha_cita', mondayStr)
      .lte('fecha_cita', sundayStr)

    const { count: confirmedWeek } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('fecha_cita', mondayStr)
      .lte('fecha_cita', sundayStr)
      .eq('statut', 'pagado')

    const lastMonday = new Date(monday)
    lastMonday.setDate(lastMonday.getDate() - 7)
    const lastSunday = new Date(sunday)
    lastSunday.setDate(lastSunday.getDate() - 7)

    const { count: lastWeekAppointments } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('fecha_cita', lastMonday.toISOString().split('T')[0])
      .lte('fecha_cita', lastSunday.toISOString().split('T')[0])

    weekStats = {
      appointments: weekAppointments ?? 0,
      patients: patientCount ?? 0,
      confirmedPct:
        weekAppointments && weekAppointments > 0 ? Math.round(((confirmedWeek ?? 0) / weekAppointments) * 100) : 0,
      deltaVsLastWeek: (weekAppointments ?? 0) - (lastWeekAppointments ?? 0),
    }
  }

  return (
    <DashboardHomeView
      displayName={profile?.nombre_completo || profile?.nom || user?.email || ''}
      greeting={greetingBucket(hour)}
      onboarding={onboarding}
      completedSteps={completedSteps}
      totalSteps={totalSteps}
      upcomingCount={upcomingCount ?? 0}
      patientCount={patientCount ?? 0}
      todayAppointments={todayAppointments}
      weekStats={weekStats}
      todayLabel={todayLabel}
    />
  )
}

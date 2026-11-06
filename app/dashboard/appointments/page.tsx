import { createClient } from '@/lib/supabase/server'
import { ahoraEnFuseau } from '@/lib/utils/timezone'
import AppointmentsView from './AppointmentsView'

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: { statut?: string; depuis?: string; jusquau?: string }
}) {
  const supabase = createClient()

  // organization_id + fuseau du praticien connecte -- necessaire pour filtrer explicitement
  // actos_realizados (comme analisis/page.tsx) et calculer "ce mois-ci" dans le bon fuseau
  // (meme pattern que app/api/patients/[id]/notes/route.ts, gestionar/[token] et reservar/[slug]).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, organizations(fuseau)')
    .eq('id', user?.id ?? '')
    .maybeSingle()
  const organizationId = profile?.organization_id ?? null
  const fuseau = profile?.organizations?.fuseau ?? 'America/Lima'

  let query = supabase
    .from('appointments')
    .select('id, fecha_cita, hora_cita, statut, monto_acompte, patients(nom)')
    .order('fecha_cita', { ascending: false })

  const statuts = ['pendiente', 'confirmado', 'en_curso', 'pagado', 'anulado'] as const
  if (searchParams.statut && statuts.includes(searchParams.statut as typeof statuts[number])) {
    query = query.eq('statut', searchParams.statut as typeof statuts[number])
  }
  if (searchParams.depuis) query = query.gte('fecha_cita', searchParams.depuis)
  if (searchParams.jusquau) query = query.lte('fecha_cita', searchParams.jusquau)

  const { data: appointments, error } = await query

  // Vue calendrier : independante du filtre statut ci-dessus, montre toujours
  // uniquement les RDV payes (agenda confirme du praticien). Isolation par
  // organisation deja garantie par la RLS, comme pour la requete appointments
  // ci-dessus.
  const { data: paidAppointments } = await supabase
    .from('appointments')
    .select('id, fecha_cita, hora_cita, hora_fin, patients(nom)')
    .eq('statut', 'pagado')
    .order('fecha_cita', { ascending: true })
    .limit(500)

  // Widget compact "top 3 traitements" (voir AppointmentsView) -- meme requete que
  // analisis/page.tsx mais limitee au mois en cours. "1er du mois" calcule dans le fuseau reel
  // de l'organisation (pas en UTC pur) -- sinon un acte tard le soir en debut/fin de mois peut
  // etre inclus/exclu a tort selon le fuseau. Filtre organization_id explicite par coherence
  // de defense en profondeur avec analisis/page.tsx, meme si la RLS (tenant_isolation,
  // migration 038) protege deja contre une fuite reelle.
  const debutMois = `${ahoraEnFuseau(fuseau).fecha.slice(0, 7)}-01`
  const { data: actosRealizadosRaw } = await supabase
    .from('actos_realizados')
    .select('monto, fecha, acto_texto_libre, actos(nombre)')
    .eq('organization_id', organizationId ?? '')
    .gte('fecha', debutMois)

  const actosDelMes = (actosRealizadosRaw ?? []).map((a) => ({
    monto: Number(a.monto),
    fecha: a.fecha,
    nombre: (a.actos as unknown as { nombre: string } | null)?.nombre ?? a.acto_texto_libre ?? '',
  }))

  return (
    <AppointmentsView
      appointments={(appointments ?? []).map((a) => ({
        ...a,
        patients: a.patients as { nom: string } | null,
      }))}
      paidAppointments={(paidAppointments ?? []).map((a) => ({
        ...a,
        patients: a.patients as { nom: string } | null,
      }))}
      actosDelMes={actosDelMes}
      error={error?.message ?? null}
      statut={searchParams.statut ?? ''}
      depuis={searchParams.depuis ?? ''}
      jusquau={searchParams.jusquau ?? ''}
    />
  )
}

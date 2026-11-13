import { createClient } from '@/lib/supabase/server'
import { ahoraEnFuseau } from '@/lib/utils/timezone'
import AppointmentsView from './AppointmentsView'

const PERIODOS_TOP = ['mes', 'trimestre', 'semestre', 'anio'] as const
type PeriodoTop = (typeof PERIODOS_TOP)[number]

// Date de debut de la fenetre, dans le fuseau du praticien (meme pattern que debutMois existant --
// jamais un calcul en UTC pur, sinon un acte tard le soir en debut/fin de periode peut etre
// inclus/exclu a tort selon le fuseau). "hoy" est deja une chaine 'YYYY-MM-DD' (ahoraEnFuseau).
function debutPeriodoTop(periodo: PeriodoTop, hoy: string): string {
  const anio = hoy.slice(0, 4)
  const mes = Number(hoy.slice(5, 7))
  switch (periodo) {
    case 'trimestre': {
      const mesTrimestre = Math.floor((mes - 1) / 3) * 3 + 1
      return `${anio}-${String(mesTrimestre).padStart(2, '0')}-01`
    }
    case 'semestre':
      return `${anio}-${mes <= 6 ? '01' : '07'}-01`
    case 'anio':
      return `${anio}-01-01`
    case 'mes':
    default:
      return `${hoy.slice(0, 7)}-01`
  }
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: { statut?: string; depuis?: string; jusquau?: string; periodoTop?: string }
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
  // analisis/page.tsx mais limitee a la fenetre choisie (periodoTop). Filtre organization_id
  // explicite par coherence de defense en profondeur avec analisis/page.tsx, meme si la RLS
  // (tenant_isolation, migration 038) protege deja contre une fuite reelle.
  const periodoTop: PeriodoTop = PERIODOS_TOP.includes(searchParams.periodoTop as PeriodoTop)
    ? (searchParams.periodoTop as PeriodoTop)
    : 'mes'
  const debutPeriodo = debutPeriodoTop(periodoTop, ahoraEnFuseau(fuseau).fecha)
  const { data: actosRealizadosRaw } = await supabase
    .from('actos_realizados')
    .select('monto, fecha, acto_texto_libre, actos(nombre)')
    .eq('organization_id', organizationId ?? '')
    .gte('fecha', debutPeriodo)

  const actosDelPeriodo = (actosRealizadosRaw ?? []).map((a) => ({
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
      actosDelPeriodo={actosDelPeriodo}
      periodoTop={periodoTop}
      error={error?.message ?? null}
      statut={searchParams.statut ?? ''}
      depuis={searchParams.depuis ?? ''}
      jusquau={searchParams.jusquau ?? ''}
    />
  )
}

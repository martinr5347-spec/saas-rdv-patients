import { createClient } from '@/lib/supabase/server'
import AnalisisView from './AnalisisView'

async function getOrganizationId() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()
  return { supabase, organizationId: profile?.organization_id ?? null }
}

export default async function AnalisisPage() {
  const { supabase, organizationId } = await getOrganizationId()

  // 24 derniers mois pour pouvoir comparer année en cours vs année précédente
  const start = new Date()
  start.setUTCMonth(start.getUTCMonth() - 23)
  start.setUTCDate(1)
  const startStr = start.toISOString().slice(0, 10)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('fecha_cita, statut, monto_acompte, montant_consultation, presente')
    .eq('organization_id', organizationId ?? '')
    .gte('fecha_cita', startStr)

  const { data: manuales } = await supabase
    .from('ingresos_manuales')
    .select('fecha, monto')
    .eq('organization_id', organizationId ?? '')
    .gte('fecha', startStr)

  // Base du Pareto 80/20 -- groupby reel fait cote client (AnalisisView), ici on resout juste le
  // nom affichable (acto.nombre ou acto_texto_libre) pour ne pas exposer la distinction en UI.
  const { data: actosRealizadosRaw } = await supabase
    .from('actos_realizados')
    .select('monto, fecha, acto_texto_libre, actos(nombre)')
    .eq('organization_id', organizationId ?? '')
    .gte('fecha', startStr)

  const actosRealizados = (actosRealizadosRaw ?? []).map((a) => ({
    monto: Number(a.monto),
    fecha: a.fecha,
    nombre: (a.actos as unknown as { nombre: string } | null)?.nombre ?? a.acto_texto_libre ?? '',
  }))

  return <AnalisisView appointments={appointments ?? []} manuales={manuales ?? []} actosRealizados={actosRealizados} />
}

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

  return <AnalisisView appointments={appointments ?? []} manuales={manuales ?? []} />
}

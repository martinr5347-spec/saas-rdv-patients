import { createClient } from '@/lib/supabase/server'
import DisponibilidadView from './DisponibilidadView'
import { updateDisponibilidad, updateSlug, addBlockedDate, removeBlockedDate } from './actions'

export default async function DisponibilidadPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const { data: organization } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', profile?.organization_id ?? '')
    .maybeSingle()

  const { data: settings } = await supabase
    .from('org_settings')
    .select('duracion_cita_min, buffer_min, anticipacion_min_horas, anticipacion_max_dias')
    .eq('organization_id', profile?.organization_id ?? '')
    .maybeSingle()

  const { data: availability } = await supabase
    .from('org_availability')
    .select('id, dia_semana, hora_inicio, hora_fin')
    .eq('organization_id', profile?.organization_id ?? '')
    .order('dia_semana')

  const { data: blockedDates } = await supabase
    .from('org_blocked_dates')
    .select('id, fecha, motivo')
    .eq('organization_id', profile?.organization_id ?? '')
    .order('fecha')

  return (
    <DisponibilidadView
      organizationSlug={organization?.slug ?? null}
      availability={availability ?? []}
      blockedDates={blockedDates ?? []}
      duracionCitaMin={settings?.duracion_cita_min ?? 30}
      bufferMin={settings?.buffer_min ?? 0}
      anticipacionMinHoras={settings?.anticipacion_min_horas ?? 2}
      anticipacionMaxDias={settings?.anticipacion_max_dias ?? 60}
      updateDisponibilidadAction={updateDisponibilidad}
      updateSlugAction={updateSlug}
      addBlockedDateAction={addBlockedDate}
      removeBlockedDateAction={removeBlockedDate}
    />
  )
}

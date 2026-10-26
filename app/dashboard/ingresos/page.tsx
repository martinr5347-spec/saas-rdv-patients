import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { parseRango, rangeSpan, formatPeriodo } from '@/lib/ingresos/rango'
import IngresosView from './IngresosView'

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
  return { supabase, userId: user?.id ?? null, organizationId: profile?.organization_id ?? null }
}

async function createIngreso(formData: FormData) {
  'use server'
  const { supabase, userId, organizationId } = await getOrganizationId()
  if (!organizationId) return

  await supabase.from('ingresos_manuales').insert({
    organization_id: organizationId,
    fecha: String(formData.get('fecha')),
    monto: Number(formData.get('monto')),
    metodo_pago: String(formData.get('metodo_pago')) as 'efectivo' | 'transferencia' | 'otro',
    paciente_nombre: String(formData.get('paciente_nombre') ?? '').trim() || null,
    concepto: String(formData.get('concepto') ?? '').trim() || null,
    created_by: userId,
  })

  redirect(`/dashboard/ingresos?desde=${formData.get('desde')}&hasta=${formData.get('hasta')}`)
}

async function updateIngreso(formData: FormData) {
  'use server'
  const { supabase, organizationId } = await getOrganizationId()
  if (!organizationId) return

  await supabase
    .from('ingresos_manuales')
    .update({
      fecha: String(formData.get('fecha')),
      monto: Number(formData.get('monto')),
      metodo_pago: String(formData.get('metodo_pago')) as 'efectivo' | 'transferencia' | 'otro',
      paciente_nombre: String(formData.get('paciente_nombre') ?? '').trim() || null,
      concepto: String(formData.get('concepto') ?? '').trim() || null,
    })
    .eq('id', String(formData.get('id')))
    .eq('organization_id', organizationId)

  redirect(`/dashboard/ingresos?desde=${formData.get('desde')}&hasta=${formData.get('hasta')}`)
}

async function deleteIngreso(formData: FormData) {
  'use server'
  const { supabase, organizationId } = await getOrganizationId()
  if (!organizationId) return

  await supabase
    .from('ingresos_manuales')
    .delete()
    .eq('id', String(formData.get('id')))
    .eq('organization_id', organizationId)

  redirect(`/dashboard/ingresos?desde=${formData.get('desde')}&hasta=${formData.get('hasta')}`)
}

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string; edit?: string }
}) {
  const { supabase, organizationId } = await getOrganizationId()
  const { desdeAno, desdeMes, hastaAno, hastaMes } = parseRango(searchParams.desde, searchParams.hasta)
  const desde = formatPeriodo(desdeAno, desdeMes)
  const hasta = formatPeriodo(hastaAno, hastaMes)
  const { start, end, startStr, endStr } = rangeSpan(desdeAno, desdeMes, hastaAno, hastaMes)

  const { data: manuales } = await supabase
    .from('ingresos_manuales')
    .select('id, fecha, monto, metodo_pago, paciente_nombre, concepto')
    .eq('organization_id', organizationId ?? '')
    .gte('fecha', startStr)
    .lt('fecha', endStr)
    .order('fecha', { ascending: false })

  const { data: pagosMp } = await supabase
    .from('appointments')
    .select('id, fecha_pago, monto_acompte, notas, patients(nom)')
    .eq('organization_id', organizationId ?? '')
    .eq('statut', 'pagado')
    .gte('fecha_pago', start.toISOString())
    .lt('fecha_pago', end.toISOString())
    .order('fecha_pago', { ascending: false })

  const { data: pagosConsulta } = await supabase
    .from('appointments')
    .select('id, montant_consultation, concepto_consultation, fecha_cita, patients(nom)')
    .not('montant_consultation', 'is', null)
    .eq('organization_id', organizationId ?? '')
    .gte('fecha_cita', startStr)
    .lt('fecha_cita', endStr)
    .order('fecha_cita', { ascending: false })

  // 4e source de revenu (cf. prompt "actos facturables") -- meme fenetre de dates que les 3
  // sources existantes ci-dessus, jamais fusionnee avec montant_consultation (double comptage
  // impossible : ce sont deux points d'entree distincts, l'ancien retire pour les nouveaux cas).
  const { data: actosRealizados } = await supabase
    .from('actos_realizados')
    .select('id, monto, fecha, acto_texto_libre, actos(nombre), patients(nom)')
    .eq('organization_id', organizationId ?? '')
    .gte('fecha', startStr)
    .lt('fecha', endStr)
    .order('fecha', { ascending: false })

  const { data: orgSettings } = await supabase
    .from('org_settings')
    .select('monnaie')
    .eq('organization_id', organizationId ?? '')
    .maybeSingle()

  const editingEntry = searchParams.edit
    ? (manuales ?? []).find((m) => m.id === searchParams.edit) ?? null
    : null

  return (
    <IngresosView
      desde={desde}
      hasta={hasta}
      monnaie={orgSettings?.monnaie ?? 'PEN'}
      manuales={manuales ?? []}
      pagosMp={(pagosMp ?? []).map((p) => ({
        id: p.id,
        fecha_pago: p.fecha_pago,
        monto_acompte: p.monto_acompte,
        notas: p.notas,
        patients: p.patients as { nom: string } | null,
      }))}
      pagosConsulta={(pagosConsulta ?? []).map((p) => ({
        id: p.id,
        monto: Number(p.montant_consultation),
        fecha: p.fecha_cita,
        paciente_nombre: (p.patients as { nom: string } | null)?.nom ?? null,
        concepto: p.concepto_consultation ?? null,
      }))}
      actosRealizados={(actosRealizados ?? []).map((a) => ({
        id: a.id,
        monto: Number(a.monto),
        fecha: a.fecha,
        paciente_nombre: (a.patients as { nom: string } | null)?.nom ?? null,
        nombre: (a.actos as unknown as { nombre: string } | null)?.nombre ?? a.acto_texto_libre ?? '',
      }))}
      editingEntry={editingEntry}
      createAction={createIngreso}
      updateAction={updateIngreso}
      deleteAction={deleteIngreso}
    />
  )
}

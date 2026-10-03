import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import IngresosView from './IngresosView'

function parsePeriodo(periodo: string | undefined): { mes: number; ano: number } {
  if (periodo && /^\d{4}-\d{2}$/.test(periodo)) {
    const [anoStr, mesStr] = periodo.split('-')
    return { ano: Number(anoStr), mes: Number(mesStr) }
  }
  const now = new Date()
  return { ano: now.getUTCFullYear(), mes: now.getUTCMonth() + 1 }
}

function monthRange(mes: number, ano: number) {
  const start = new Date(Date.UTC(ano, mes - 1, 1))
  const end = new Date(Date.UTC(ano, mes, 1))
  return { start, end, startStr: start.toISOString().slice(0, 10), endStr: end.toISOString().slice(0, 10) }
}

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

  redirect(`/dashboard/ingresos?periodo=${formData.get('periodo')}`)
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

  redirect(`/dashboard/ingresos?periodo=${formData.get('periodo')}`)
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

  redirect(`/dashboard/ingresos?periodo=${formData.get('periodo')}`)
}

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: { periodo?: string; edit?: string }
}) {
  const { supabase, organizationId } = await getOrganizationId()
  const { mes, ano } = parsePeriodo(searchParams.periodo)
  const periodo = `${ano}-${String(mes).padStart(2, '0')}`
  const { start, end, startStr, endStr } = monthRange(mes, ano)

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
      periodo={periodo}
      monnaie={orgSettings?.monnaie ?? 'PEN'}
      manuales={manuales ?? []}
      pagosMp={(pagosMp ?? []).map((p) => ({
        id: p.id,
        fecha_pago: p.fecha_pago,
        monto_acompte: p.monto_acompte,
        notas: p.notas,
        patients: p.patients as { nom: string } | null,
      }))}
      editingEntry={editingEntry}
      createAction={createIngreso}
      updateAction={updateIngreso}
      deleteAction={deleteIngreso}
    />
  )
}

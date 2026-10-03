import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderIngresosPdf, type IngresoPdfRow } from '@/lib/pdf/ingresosPdf'

function parsePeriodo(periodo: string | null): { mes: number; ano: number } {
  if (periodo && /^\d{4}-\d{2}$/.test(periodo)) {
    const [anoStr, mesStr] = periodo.split('-')
    return { ano: Number(anoStr), mes: Number(mesStr) }
  }
  const now = new Date()
  return { ano: now.getUTCFullYear(), mes: now.getUTCMonth() + 1 }
}

export async function GET(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, idioma')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const { mes, ano } = parsePeriodo(url.searchParams.get('periodo'))
  const start = new Date(Date.UTC(ano, mes - 1, 1))
  const end = new Date(Date.UTC(ano, mes, 1))
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)

  const [{ data: organization }, { data: orgSettings }, { data: manuales }, { data: pagosMp }] = await Promise.all([
    supabase.from('organizations').select('nom').eq('id', profile.organization_id).maybeSingle(),
    supabase.from('org_settings').select('monnaie').eq('organization_id', profile.organization_id).maybeSingle(),
    supabase
      .from('ingresos_manuales')
      .select('fecha, monto, metodo_pago, paciente_nombre, concepto')
      .eq('organization_id', profile.organization_id)
      .gte('fecha', startStr)
      .lt('fecha', endStr),
    supabase
      .from('appointments')
      .select('fecha_pago, monto_acompte, notas, patients(nom)')
      .eq('organization_id', profile.organization_id)
      .eq('statut', 'pagado')
      .gte('fecha_pago', start.toISOString())
      .lt('fecha_pago', end.toISOString()),
  ])

  const rows: IngresoPdfRow[] = [
    ...(manuales ?? []).map((m) => ({
      fecha: m.fecha,
      paciente: m.paciente_nombre ?? '',
      concepto: m.concepto ?? '',
      metodo: m.metodo_pago,
      monto: Number(m.monto),
    })),
    ...(pagosMp ?? []).map((p) => ({
      fecha: p.fecha_pago ? p.fecha_pago.slice(0, 10) : '',
      paciente: (p.patients as { nom: string } | null)?.nom ?? '',
      concepto: p.notas ?? '',
      metodo: 'mercadopago' as const,
      monto: Number(p.monto_acompte),
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

  const totalManual = (manuales ?? []).reduce((sum, m) => sum + Number(m.monto), 0)
  const totalMp = (pagosMp ?? []).reduce((sum, p) => sum + Number(p.monto_acompte), 0)

  const pdfBuffer = await renderIngresosPdf({
    locale: profile.idioma === 'pt' ? 'pt' : 'es',
    clinicName: organization?.nom ?? '',
    mes,
    ano,
    monnaie: orgSettings?.monnaie ?? 'PEN',
    totalMonth: totalManual + totalMp,
    totalMp,
    totalManual,
    rows,
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ingresos_${ano}-${String(mes).padStart(2, '0')}.pdf"`,
    },
  })
}

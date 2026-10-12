import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseRango, rangeSpan } from '@/lib/ingresos/rango'

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"'
  return value
}

export async function GET(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const { desdeAno, desdeMes, hastaAno, hastaMes } = parseRango(
    url.searchParams.get('desde'),
    url.searchParams.get('hasta')
  )
  const { start, end, startStr, endStr } = rangeSpan(desdeAno, desdeMes, hastaAno, hastaMes)

  const { data: manuales } = await supabase
    .from('ingresos_manuales')
    .select('fecha, monto, metodo_pago, paciente_nombre, concepto')
    .eq('organization_id', profile.organization_id)
    .gte('fecha', startStr)
    .lt('fecha', endStr)

  const { data: pagosMp } = await supabase
    .from('appointments')
    .select('fecha_pago, monto_acompte, notas, patients(nom)')
    .eq('organization_id', profile.organization_id)
    .eq('statut', 'pagado')
    .gte('fecha_pago', start.toISOString())
    .lt('fecha_pago', end.toISOString())

  const { data: pagosConsulta } = await supabase
    .from('appointments')
    .select('montant_consultation, concepto_consultation, fecha_cita, patients(nom)')
    .not('montant_consultation', 'is', null)
    .eq('organization_id', profile.organization_id)
    .gte('fecha_cita', startStr)
    .lt('fecha_cita', endStr)

  type Row = { fecha: string; paciente: string; concepto: string; metodo: string; monto: number }

  const rows: Row[] = [
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
      metodo: 'mercadopago',
      monto: Number(p.monto_acompte),
    })),
    ...(pagosConsulta ?? []).map((p) => ({
      fecha: p.fecha_cita,
      paciente: (p.patients as { nom: string } | null)?.nom ?? '',
      concepto: p.concepto_consultation ?? '',
      metodo: 'consulta',
      monto: Number(p.montant_consultation),
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

  const lines = ['Fecha,Paciente,Concepto,Metodo,Monto']
  for (const r of rows) {
    lines.push([r.fecha, csvEscape(r.paciente), csvEscape(r.concepto), r.metodo, r.monto.toFixed(2)].join(','))
  }
  const csv = String.fromCharCode(0xfeff) + lines.join('\n')

  const filename =
    desdeAno === hastaAno && desdeMes === hastaMes
      ? `ingresos_${desdeAno}-${String(desdeMes).padStart(2, '0')}.csv`
      : `ingresos_${desdeAno}-${String(desdeMes).padStart(2, '0')}_${hastaAno}-${String(hastaMes).padStart(2, '0')}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

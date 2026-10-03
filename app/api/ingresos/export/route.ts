import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function parsePeriodo(periodo: string | null): { mes: number; ano: number } {
  if (periodo && /^\d{4}-\d{2}$/.test(periodo)) {
    const [anoStr, mesStr] = periodo.split('-')
    return { ano: Number(anoStr), mes: Number(mesStr) }
  }
  const now = new Date()
  return { ano: now.getUTCFullYear(), mes: now.getUTCMonth() + 1 }
}

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
  const { mes, ano } = parsePeriodo(url.searchParams.get('periodo'))
  const start = new Date(Date.UTC(ano, mes - 1, 1))
  const end = new Date(Date.UTC(ano, mes, 1))
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)

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
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

  const lines = ['Fecha,Paciente,Concepto,Metodo,Monto']
  for (const r of rows) {
    lines.push([r.fecha, csvEscape(r.paciente), csvEscape(r.concepto), r.metodo, r.monto.toFixed(2)].join(','))
  }
  const csv = String.fromCharCode(0xfeff) + lines.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ingresos_${ano}-${String(mes).padStart(2, '0')}.csv"`,
    },
  })
}

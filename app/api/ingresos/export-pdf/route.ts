import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderIngresosPdf, type IngresoPdfRow } from '@/lib/pdf/ingresosPdf'
import { parseRango, rangeSpan } from '@/lib/ingresos/rango'
import esMessages from '@/messages/es.json'
import ptMessages from '@/messages/pt.json'

const MESSAGES = { es: esMessages, pt: ptMessages }

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
  const { desdeAno, desdeMes, hastaAno, hastaMes } = parseRango(
    url.searchParams.get('desde'),
    url.searchParams.get('hasta')
  )
  const { start, end, startStr, endStr } = rangeSpan(desdeAno, desdeMes, hastaAno, hastaMes)

  const [{ data: organization }, { data: orgSettings }, { data: manuales }, { data: pagosMp }, { data: pagosConsulta }] =
    await Promise.all([
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
      supabase
        .from('appointments')
        .select('montant_consultation, concepto_consultation, fecha_cita, patients(nom)')
        .not('montant_consultation', 'is', null)
        .eq('organization_id', profile.organization_id)
        .gte('fecha_cita', startStr)
        .lt('fecha_cita', endStr),
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
    ...(pagosConsulta ?? []).map((p) => ({
      fecha: p.fecha_cita,
      paciente: (p.patients as { nom: string } | null)?.nom ?? '',
      concepto: p.concepto_consultation ?? '',
      metodo: 'consulta' as const,
      monto: Number(p.montant_consultation),
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

  const totalManual = (manuales ?? []).reduce((sum, m) => sum + Number(m.monto), 0)
  const totalMp = (pagosMp ?? []).reduce((sum, p) => sum + Number(p.monto_acompte), 0)
  const totalConsulta = (pagosConsulta ?? []).reduce((sum, p) => sum + Number(p.montant_consultation), 0)

  const locale = profile.idioma === 'pt' ? 'pt' : 'es'
  const months = MESSAGES[locale].dashboard.ingresos.months
  const periodoLabel =
    desdeAno === hastaAno && desdeMes === hastaMes
      ? `${months[desdeMes - 1]} ${desdeAno}`
      : `${months[desdeMes - 1]} ${desdeAno} - ${months[hastaMes - 1]} ${hastaAno}`

  const pdfBuffer = await renderIngresosPdf({
    locale,
    clinicName: organization?.nom ?? '',
    periodoLabel,
    monnaie: orgSettings?.monnaie ?? 'PEN',
    totalMonth: totalManual + totalMp + totalConsulta,
    totalMp,
    totalConsulta,
    totalManual,
    rows,
  })

  const filename =
    desdeAno === hastaAno && desdeMes === hastaMes
      ? `ingresos_${desdeAno}-${String(desdeMes).padStart(2, '0')}.pdf`
      : `ingresos_${desdeAno}-${String(desdeMes).padStart(2, '0')}_${hastaAno}-${String(hastaMes).padStart(2, '0')}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

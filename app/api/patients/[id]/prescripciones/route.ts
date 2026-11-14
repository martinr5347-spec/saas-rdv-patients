import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PrescripcionMedicamento } from '@/lib/pdf/prescripcionPdf'
import { parsePrescripcionBody } from '@/lib/patients/prescripcionBody'
import type { Json } from '@/types/database'

// Donnee medicale simple (feuille signee/tamponnee a la main par le praticien, cf. prompt
// prescripciones) -- pas de PIN, systeme separe des notas clinicas confidentielles (voir
// app/api/patients/[id]/notes/route.ts pour ce dernier).
//
// storage_path null = brouillon (editable via PUT, voir [prescripcionId]/route.ts), storage_path
// renseigne = validee (immuable, generee par [prescripcionId]/generar/route.ts). Ce POST ne cree
// plus que le brouillon -- la generation/upload du PDF ont migre vers la route "generar" (cf.
// prompt prescripciones-borrador).

async function getAuthContext(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle()
  return { organizationId: profile?.organization_id ?? null, userId: user.id }
}

// GET = historique des prescriptions du patient (date + apercu medicamentos) -- jamais de PDF
// genere ici, le telechargement passe par la route dediee [prescripcionId]/download.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const auth = await getAuthContext(supabase)
  if (!auth?.organizationId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: patientRow } = await supabase
    .from('patients')
    .select('id')
    .eq('id', params.id)
    .eq('organization_id', auth.organizationId)
    .maybeSingle()
  if (!patientRow) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  const { data: prescripciones } = await supabase
    .from('prescripciones')
    .select('id, fecha, medicamentos, notas_adicionales, storage_path, created_at')
    .eq('patient_id', params.id)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  return NextResponse.json({
    prescripciones: (prescripciones ?? []).map((p) => ({
      id: p.id,
      fecha: p.fecha,
      medicamentos: (p.medicamentos as unknown as PrescripcionMedicamento[] | null) ?? [],
      notasAdicionales: p.notas_adicionales,
      esBorrador: p.storage_path === null,
      createdAt: p.created_at,
    })),
  })
}

// POST = cree un brouillon (storage_path null) -- aucun PDF genere/uploade ici. La generation (et
// l'upload dans 'recetas-anteriores') se fait desormais via [prescripcionId]/generar/route.ts,
// une fois le brouillon relu/corrige par le praticien.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const auth = await getAuthContext(supabase)
  if (!auth?.organizationId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: patientRow } = await supabase
    .from('patients')
    .select('id')
    .eq('id', params.id)
    .eq('organization_id', auth.organizationId)
    .maybeSingle()
  if (!patientRow) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = parsePrescripcionBody(body)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const { fecha, medicamentos, notasAdicionales } = parsed

  const { data: prescripcionRow, error: insertError } = await supabase
    .from('prescripciones')
    .insert({
      patient_id: params.id,
      organization_id: auth.organizationId,
      created_by: auth.userId,
      fecha,
      medicamentos: medicamentos as unknown as Json,
      notas_adicionales: notasAdicionales,
      storage_path: null,
    })
    .select('id, fecha, medicamentos, notas_adicionales, created_at')
    .single()

  if (insertError || !prescripcionRow) {
    return NextResponse.json({ error: insertError?.message ?? 'Error al guardar la prescripción' }, { status: 500 })
  }

  return NextResponse.json({
    prescripcion: {
      id: prescripcionRow.id,
      fecha: prescripcionRow.fecha,
      medicamentos: (prescripcionRow.medicamentos as unknown as PrescripcionMedicamento[] | null) ?? [],
      notasAdicionales: prescripcionRow.notas_adicionales,
      esBorrador: true,
      createdAt: prescripcionRow.created_at,
    },
  })
}

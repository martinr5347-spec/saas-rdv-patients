import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderPrescripcionPdf, PrescripcionMedicamento } from '@/lib/pdf/prescripcionPdf'
import { normalizarNombreArchivo, formatFechaArchivo } from '@/lib/utils/normalizarNombreArchivo'
import type { Json } from '@/types/database'

// Donnee medicale simple (feuille signee/tamponnee a la main par le praticien, cf. prompt
// prescripciones) -- pas de PIN, systeme separe des notas clinicas confidentielles (voir
// app/api/patients/[id]/notes/route.ts pour ce dernier).

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
    .select('id, fecha, medicamentos, notas_adicionales, created_at')
    .eq('patient_id', params.id)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  return NextResponse.json({
    prescripciones: (prescripciones ?? []).map((p) => ({
      id: p.id,
      fecha: p.fecha,
      medicamentos: (p.medicamentos as unknown as PrescripcionMedicamento[] | null) ?? [],
      notasAdicionales: p.notas_adicionales,
      createdAt: p.created_at,
    })),
  })
}

// POST = genere le PDF, l'uploade dans 'recetas-anteriores', puis insere la ligne prescripciones.
// Si l'insertion echoue apres l'upload, supprime le fichier pour ne pas laisser d'orphelin --
// meme pattern que app/api/patients/[id]/notes/[noteId]/photos/route.ts.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const auth = await getAuthContext(supabase)
  if (!auth?.organizationId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: patientRow } = await supabase
    .from('patients')
    .select('id, nom')
    .eq('id', params.id)
    .eq('organization_id', auth.organizationId)
    .maybeSingle()
  if (!patientRow) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const fecha = body.fecha as string | undefined
  const medicamentosRaw = Array.isArray(body.medicamentos) ? body.medicamentos : []
  const notasAdicionales = typeof body.notasAdicionales === 'string' ? body.notasAdicionales.trim() || null : null

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  }

  const medicamentos: PrescripcionMedicamento[] = medicamentosRaw
    .map((m: Record<string, unknown>) => ({
      nombre: String(m?.nombre ?? '').trim(),
      dosis: String(m?.dosis ?? '').trim(),
      frecuencia: String(m?.frecuencia ?? '').trim(),
      duracion: String(m?.duracion ?? '').trim(),
      instrucciones: String(m?.instrucciones ?? '').trim(),
    }))
    .filter((m: PrescripcionMedicamento) => m.nombre)

  if (medicamentos.length === 0) {
    return NextResponse.json({ error: 'Agrega al menos un medicamento con nombre' }, { status: 400 })
  }

  const { data: org } = await supabase.from('organizations').select('nom, adresse, langue').eq('id', auth.organizationId).maybeSingle()
  // Organisation mono-praticien (pas d'equipe) -- le nom/colegiatura affiches sur le document sont
  // ceux du praticien de l'organisation, pas forcement de l'utilisateur connecte (le staff peut
  // saisir la prescription pour le praticien).
  const { data: praticien } = await supabase
    .from('users')
    .select('nom, numero_colegiatura')
    .eq('organization_id', auth.organizationId)
    .eq('role', 'praticien')
    .maybeSingle()

  const locale: 'es' | 'pt' = org?.langue === 'pt' ? 'pt' : 'es'

  const nombreNormalizado = normalizarNombreArchivo(patientRow.nom)
  const fechaArchivo = formatFechaArchivo(fecha)
  // Deux prescriptions du meme patient le meme jour partageraient sinon le meme nom de fichier --
  // le bucket n'a pas de policy RLS "update" (voir migration), donc le 2e upload echouerait tout
  // simplement ; meme avec upsert, ca ecraserait silencieusement le PDF de la 1ere prescription du
  // jour (dont la ligne prescripciones pointerait alors vers le mauvais contenu). Suffixe _2, _3...
  // uniquement a partir de la 2e du jour -- le format {Nombre}_{jj-mm-aa}.pdf exact de la prompt
  // reste intact pour le cas courant (une seule prescription ce jour-la).
  const { count: countMemeJour } = await supabase
    .from('prescripciones')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', params.id)
    .eq('fecha', fecha)
  const suffixMemeJour = (countMemeJour ?? 0) > 0 ? `_${(countMemeJour ?? 0) + 1}` : ''
  const filename = `${nombreNormalizado}_${fechaArchivo}${suffixMemeJour}.pdf`
  const storagePath = `${auth.organizationId}/${params.id}/${filename}`

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderPrescripcionPdf({
      locale,
      clinicName: org?.nom ?? '',
      praticienNombre: praticien?.nom ?? '',
      numeroColegiatura: praticien?.numero_colegiatura ?? null,
      clinicAdresse: org?.adresse ?? null,
      patientNombre: patientRow.nom,
      fecha,
      medicamentos,
      notasAdicionales,
    })
  } catch (e) {
    console.error('Erreur génération PDF prescripción:', e)
    return NextResponse.json({ error: 'No se pudo generar el PDF' }, { status: 500 })
  }

  const { error: uploadError } = await supabase.storage
    .from('recetas-anteriores')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf' })
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: prescripcionRow, error: insertError } = await supabase
    .from('prescripciones')
    .insert({
      patient_id: params.id,
      organization_id: auth.organizationId,
      created_by: auth.userId,
      fecha,
      medicamentos: medicamentos as unknown as Json,
      notas_adicionales: notasAdicionales,
      storage_path: storagePath,
    })
    .select('id, fecha, medicamentos, notas_adicionales, created_at')
    .single()

  if (insertError || !prescripcionRow) {
    // Nettoyage : si l'insertion en base echoue, ne pas laisser un fichier orphelin dans le bucket.
    await supabase.storage.from('recetas-anteriores').remove([storagePath])
    return NextResponse.json({ error: insertError?.message ?? 'Error al guardar la prescripción' }, { status: 500 })
  }

  return NextResponse.json({
    prescripcion: {
      id: prescripcionRow.id,
      fecha: prescripcionRow.fecha,
      medicamentos: (prescripcionRow.medicamentos as unknown as PrescripcionMedicamento[] | null) ?? [],
      notasAdicionales: prescripcionRow.notas_adicionales,
      createdAt: prescripcionRow.created_at,
    },
  })
}

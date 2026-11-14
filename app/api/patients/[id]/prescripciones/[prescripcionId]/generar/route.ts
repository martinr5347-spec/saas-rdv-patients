import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderPrescripcionPdf, PrescripcionMedicamento } from '@/lib/pdf/prescripcionPdf'
import { normalizarNombreArchivo, formatFechaArchivo } from '@/lib/utils/normalizarNombreArchivo'

// POST = genere le PDF d'un brouillon (storage_path null) et l'uploade dans 'recetas-anteriores',
// puis fige la ligne (storage_path renseigne -> immuable, cf. PUT de ../route.ts qui la refusera
// ensuite). Relit fecha/medicamentos/notasAdicionales depuis la base (jamais depuis le body) : la
// source de verite est ce que le praticien a sauvegarde en brouillon, pas un etat du formulaire
// potentiellement perime cote client -- cf. prompt prescripciones-borrador.
export async function POST(req: Request, { params }: { params: { id: string; prescripcionId: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle()
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: patientRow } = await supabase
    .from('patients')
    .select('id, nom')
    .eq('id', params.id)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()
  if (!patientRow) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  const { data: prescripcionRow } = await supabase
    .from('prescripciones')
    .select('id, fecha, medicamentos, notas_adicionales, storage_path')
    .eq('id', params.prescripcionId)
    .eq('patient_id', params.id)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()
  if (!prescripcionRow) {
    return NextResponse.json({ error: 'Prescripción no encontrada' }, { status: 404 })
  }
  if (prescripcionRow.storage_path !== null) {
    return NextResponse.json({ error: 'Ya fue generada' }, { status: 409 })
  }

  const fecha = prescripcionRow.fecha
  const medicamentos = (prescripcionRow.medicamentos as unknown as PrescripcionMedicamento[] | null) ?? []
  const notasAdicionales = prescripcionRow.notas_adicionales

  const { data: org } = await supabase.from('organizations').select('nom, adresse, langue').eq('id', profile.organization_id).maybeSingle()
  // Organisation mono-praticien (pas d'equipe) -- le nom/colegiatura/especialidad/instagram
  // affiches sur le document sont ceux du praticien de l'organisation, pas forcement de
  // l'utilisateur connecte (le staff peut saisir la prescription pour le praticien).
  const { data: praticien } = await supabase
    .from('users')
    .select('nom, numero_colegiatura, especialidad, instagram')
    .eq('organization_id', profile.organization_id)
    .eq('role', 'praticien')
    .maybeSingle()
  const { data: orgSettings } = await supabase
    .from('org_settings')
    .select('plantilla_prescripcion')
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  const locale: 'es' | 'pt' = org?.langue === 'pt' ? 'pt' : 'es'

  const nombreNormalizado = normalizarNombreArchivo(patientRow.nom)
  const fechaArchivo = formatFechaArchivo(fecha)
  // Deux prescriptions du meme patient le meme jour partageraient sinon le meme nom de fichier --
  // le bucket n'a pas de policy RLS "update" (voir migration 049), donc le 2e upload echouerait
  // tout simplement ; meme avec upsert, ca ecraserait silencieusement le PDF de la 1ere prescription
  // du jour deja generee (dont la ligne prescripciones pointerait alors vers le mauvais contenu).
  // Compte les prescriptions DEJA GENEREES ce jour-la (storage_path non nul), pas tous les
  // brouillons -- deux brouillons du meme jour n'ont pas encore de fichier, donc pas de collision
  // possible entre eux avant generation.
  const { count: countMemeJourGenerados } = await supabase
    .from('prescripciones')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', params.id)
    .eq('fecha', fecha)
    .not('storage_path', 'is', null)
  const suffixMemeJour = (countMemeJourGenerados ?? 0) > 0 ? `_${(countMemeJourGenerados ?? 0) + 1}` : ''
  const filename = `${nombreNormalizado}_${fechaArchivo}${suffixMemeJour}.pdf`
  const storagePath = `${profile.organization_id}/${params.id}/${filename}`

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderPrescripcionPdf({
      locale,
      clinicName: org?.nom ?? '',
      praticienNombre: praticien?.nom ?? '',
      numeroColegiatura: praticien?.numero_colegiatura ?? null,
      // Meme garde que numeroColegiatura/clinicAdresse ci-dessous -- especialidad/instagram sont
      // optionnels, jamais une chaine vide '' non normalisee en null a la source (cf. crash deja
      // corrige sur clinicAdresse : '' && <Text> s'evalue a '' en JSX, ce qui plante renderToBuffer).
      especialidad: praticien?.especialidad?.trim() || null,
      instagram: praticien?.instagram?.trim() || null,
      // org.adresse est enregistre comme '' (jamais null) quand le champ est laisse vide dans
      // Configuracion (app/dashboard/settings/actions.ts) -- '' && <Text> s'evalue a '' en JSX,
      // ce qui plante renderToBuffer (texte brut hors balise <Text>, interdit par react-pdf).
      // Normaliser ici, pas dans le JSX, pour rester coherent avec numeroColegiatura ci-dessus.
      clinicAdresse: org?.adresse?.trim() || null,
      patientNombre: patientRow.nom,
      fecha,
      medicamentos,
      notasAdicionales,
      plantilla: orgSettings?.plantilla_prescripcion ?? 'clasico',
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

  const { data: updated, error: updateError } = await supabase
    .from('prescripciones')
    .update({ storage_path: storagePath })
    .eq('id', params.prescripcionId)
    .eq('organization_id', profile.organization_id)
    .select('id, fecha, medicamentos, notas_adicionales, created_at')
    .single()

  if (updateError || !updated) {
    // Nettoyage : si la mise a jour en base echoue, ne pas laisser un fichier orphelin dans le bucket.
    await supabase.storage.from('recetas-anteriores').remove([storagePath])
    return NextResponse.json({ error: updateError?.message ?? 'Error al generar la prescripción' }, { status: 500 })
  }

  return NextResponse.json({
    prescripcion: {
      id: updated.id,
      fecha: updated.fecha,
      medicamentos: (updated.medicamentos as unknown as PrescripcionMedicamento[] | null) ?? [],
      notasAdicionales: updated.notas_adicionales,
      esBorrador: false,
      createdAt: updated.created_at,
    },
  })
}

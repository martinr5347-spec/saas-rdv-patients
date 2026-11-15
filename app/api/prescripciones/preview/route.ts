import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderPrescripcionPdf, PlantillaPrescripcion } from '@/lib/pdf/prescripcionPdf'

// Apercu du modele de prescription choisi en Configuracion -- lecture seule, aucune ecriture ni en
// base ni en storage, et jamais de vraie donnee patient (cf. prompt prescripcion-plantillas-apercu).
// Reutilise directement renderPrescripcionPdf (meme fonction que la generation reelle, voir
// [prescripcionId]/generar/route.ts) pour que l'apercu ne puisse jamais diverger visuellement du
// document final.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const plantilla = searchParams.get('plantilla') as PlantillaPrescripcion | null
  if (!plantilla || !['clasico', 'minimalista', 'moderno'].includes(plantilla)) {
    return NextResponse.json({ error: 'Plantilla inválida' }, { status: 400 })
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Memes lectures que la route generar (organizations + praticien de l'org), mais patient/medicaments
  // fictifs -- aucune donnee patient reelle, aucune ecriture (ni DB ni storage).
  const { data: org } = await supabase.from('organizations').select('nom, adresse, langue').eq('id', profile.organization_id).maybeSingle()
  const { data: praticien } = await supabase
    .from('users')
    .select('nom, numero_colegiatura, especialidad, instagram')
    .eq('organization_id', profile.organization_id)
    .eq('role', 'praticien')
    .maybeSingle()

  const locale: 'es' | 'pt' = org?.langue === 'pt' ? 'pt' : 'es'
  const esPt = locale === 'pt'

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderPrescripcionPdf({
      locale,
      clinicName: org?.nom ?? (esPt ? 'Clínica Exemplo' : 'Clínica Ejemplo'),
      praticienNombre: praticien?.nom ?? (esPt ? 'Dra. Exemplo' : 'Dra. Ejemplo'),
      numeroColegiatura: praticien?.numero_colegiatura?.trim() || 'CMP 00000',
      especialidad: praticien?.especialidad?.trim() || null,
      instagram: praticien?.instagram?.trim() || null,
      clinicAdresse: org?.adresse?.trim() || null,
      patientNombre: esPt ? 'Paciente de Exemplo' : 'Paciente de Ejemplo',
      fecha: new Date().toISOString().slice(0, 10),
      medicamentos: [
        {
          nombre: esPt ? 'Medicamento de exemplo' : 'Medicamento de ejemplo',
          dosis: esPt ? '1 comprimido' : '1 comprimido',
          frecuencia: esPt ? '2x ao dia' : '2x al día',
          duracion: esPt ? '7 dias' : '7 días',
          instrucciones: esPt ? 'Tomar com água' : 'Tomar con agua',
        },
      ],
      notasAdicionales: esPt ? 'Nota adicional de exemplo.' : 'Nota adicional de ejemplo.',
      plantilla,
    })
  } catch (e) {
    console.error('Erreur génération aperçu prescripción:', e)
    return NextResponse.json({ error: 'No se pudo generar la vista previa' }, { status: 500 })
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="vista-previa.pdf"',
    },
  })
}

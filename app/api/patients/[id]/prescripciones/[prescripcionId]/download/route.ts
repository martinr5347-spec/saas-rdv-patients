import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Ne genere jamais le PDF -- sert uniquement le fichier deja stocke (URL signee), meme duree que
// pour les photos cliniques (5 min). Le nom de fichier normalise (storage_path) sert aussi au
// telechargement : {Nom_Patient}_{jj-mm-aa}.pdf.
export async function GET(req: Request, { params }: { params: { id: string; prescripcionId: string } }) {
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

  const { data: prescripcionRow } = await supabase
    .from('prescripciones')
    .select('storage_path')
    .eq('id', params.prescripcionId)
    .eq('patient_id', params.id)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()
  if (!prescripcionRow) {
    return NextResponse.json({ error: 'Prescripción no encontrada' }, { status: 404 })
  }

  const filename = prescripcionRow.storage_path.split('/').pop() ?? 'prescripcion.pdf'

  const { data: signed, error: signedError } = await supabase.storage
    .from('recetas-anteriores')
    .createSignedUrl(prescripcionRow.storage_path, 300, { download: filename })
  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: signedError?.message ?? 'No se pudo generar el enlace' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}

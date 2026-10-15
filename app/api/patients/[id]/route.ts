import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addMonths, format } from 'date-fns'
import type { Database } from '@/types/database'

type PatientUpdate = Database['public']['Tables']['patients']['Update']
type UpdatableFields = Pick<
  PatientUpdate,
  | 'fecha_nacimiento'
  | 'proximo_control_meses'
  | 'proximo_control_fecha'
  | 'proximo_control_enviado'
  | 'proximo_control_enviado_at'
  | 'proximo_control_relanzado'
  | 'proximo_control_photo_note_id'
>

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await req.json().catch(() => ({}))

  const updateData: UpdatableFields = {}

  if (body.fecha_nacimiento !== undefined) {
    if (body.fecha_nacimiento !== null && !/^\d{4}-\d{2}-\d{2}$/.test(body.fecha_nacimiento)) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
    }
    updateData.fecha_nacimiento = body.fecha_nacimiento
  }

  // Programmer ou annuler une relance "próximo control"
  if (body.proximo_control_meses !== undefined) {
    const meses = body.proximo_control_meses as number | null

    if (meses === null) {
      updateData.proximo_control_meses = null
      updateData.proximo_control_fecha = null
      updateData.proximo_control_enviado = false
      updateData.proximo_control_enviado_at = null
      updateData.proximo_control_relanzado = false
      // on n'efface PAS proximo_control_photo_note_id ici volontairement : si body ne le précise
      // pas explicitement, on ne touche pas au lien photo existant (voir bloc dédié plus bas)
    } else {
      if (!Number.isInteger(meses) || meses < 1 || meses > 12) {
        return NextResponse.json({ error: 'Meses inválido (1-12)' }, { status: 400 })
      }
      const referencia = body.proximo_control_referencia_fecha as string | undefined
      const base = referencia && /^\d{4}-\d{2}-\d{2}$/.test(referencia) ? new Date(`${referencia}T00:00:00Z`) : new Date()
      // addMonths (date-fns, deja une dependance) clampe correctement les mois plus courts
      // (31 janvier + 1 mois -> 28/29 fevrier, pas un debordement sur mars)
      const fecha = addMonths(base, meses)

      updateData.proximo_control_meses = meses
      updateData.proximo_control_fecha = format(fecha, 'yyyy-MM-dd')
      updateData.proximo_control_enviado = false
      updateData.proximo_control_enviado_at = null
      updateData.proximo_control_relanzado = false
    }
  }

  // Lien vers la note de diagnostic dont la photo doit resurgir le jour du contrôle.
  // Géré séparément de proximo_control_meses : le composant ProximoControlInput (fiche RDV,
  // sans notes/photos) ne l'envoie jamais ; seul le flux "Control" de NotasClinicasCard l'envoie.
  if (body.proximo_control_photo_note_id !== undefined) {
    updateData.proximo_control_photo_note_id = body.proximo_control_photo_note_id as string | null
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('patients')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ patient: data })
}

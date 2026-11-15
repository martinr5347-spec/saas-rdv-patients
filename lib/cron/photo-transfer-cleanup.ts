import { createServiceRoleClient } from '@/lib/supabase/admin'

// Nettoyage quotidien des photos envoyees par telephone (QR, cf. prompt notas-foto-transfer-qr)
// jamais rattachees a une note -- le praticien a pris une ou plusieurs photos puis abandonne sa
// note sans "Guardar sesion". Supprime le fichier storage puis la ligne, jamais l'inverse (ne
// jamais laisser une ligne sans fichier correspondant introuvable).
const ORPHAN_MAX_AGE_HOURS = 24

export async function cleanupOrphanPhotoTransfers() {
  const supabase = createServiceRoleClient()

  const cutoff = new Date(Date.now() - ORPHAN_MAX_AGE_HOURS * 60 * 60 * 1000).toISOString()

  const { data: orphans, error } = await supabase
    .from('patient_note_photos')
    .select('id, storage_path')
    .is('note_id', null)
    .lt('created_at', cutoff)

  if (error) {
    console.error('cleanupOrphanPhotoTransfers select error:', error)
    return
  }
  if (!orphans || orphans.length === 0) return

  const storagePaths = orphans.map((o) => o.storage_path)
  const { error: removeError } = await supabase.storage.from('clinical-photos').remove(storagePaths)
  if (removeError) {
    console.error('cleanupOrphanPhotoTransfers storage remove error:', removeError)
    // Ne pas supprimer les lignes si le fichier n'a pas pu etre supprime -- sera retente le
    // lendemain plutot que de laisser une ligne orpheline sans aucune trace du fichier.
    return
  }

  const { error: deleteError } = await supabase
    .from('patient_note_photos')
    .delete()
    .in(
      'id',
      orphans.map((o) => o.id)
    )
  if (deleteError) {
    console.error('cleanupOrphanPhotoTransfers delete error:', deleteError)
  }
}

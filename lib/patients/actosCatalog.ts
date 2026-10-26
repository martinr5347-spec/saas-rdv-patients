import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

// Listes de depart indicatives, volontairement generiques et courantes -- a valider/ajuster par
// Martin avant toute mise en avant commerciale (cf. rapport de livraison). 100% editable par le
// praticien des le depart (le seed n'ecrit jamais par-dessus une liste deja personnalisee).
export const ACTOS_ESTETICA_DERMATO = [
  'Consulta dermatológica',
  'Biopsia de piel',
  'Tratamiento de acné',
  'Toxina botulínica (Botox)',
  'Peeling químico',
  'Depilación láser',
  'Relleno facial (ácido hialurónico)',
  'Limpieza facial profunda',
  'Crioterapia',
  'Microdermoabrasión',
  'Mesoterapia facial',
  'Control post-tratamiento',
]

export const ACTOS_CLINICA_MEDICA = [
  'Consulta médica general',
  'Control de rutina',
  'Vacunación',
  'Curación de heridas',
  'Control de presión arterial',
  'Electrocardiograma',
  'Certificado médico',
  'Inyección intramuscular',
  'Control de glucosa',
  'Pequeña cirugía ambulatoria',
]

export type Especialidad = 'estetica_dermato' | 'clinica_medica'

function listaParaEspecialidad(especialidad: Especialidad): string[] {
  return especialidad === 'clinica_medica' ? ACTOS_CLINICA_MEDICA : ACTOS_ESTETICA_DERMATO
}

// Seed la liste de depart UNIQUEMENT si l'organisation n'a encore aucun acte (jamais d'ecrasement
// d'une liste deja personnalisee par le praticien) -- utilise a l'inscription ET lors d'un
// changement d'especialidad en Configuracion, meme fonction partagee dans les deux cas.
export async function seedActosIfEmpty(
  supabase: ReturnType<typeof createClient> | ReturnType<typeof createServiceRoleClient>,
  organizationId: string,
  especialidad: Especialidad | null
) {
  if (!especialidad) return

  const { count } = await supabase
    .from('actos')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if ((count ?? 0) > 0) return

  const nombres = listaParaEspecialidad(especialidad)
  await supabase.from('actos').insert(
    nombres.map((nombre) => ({
      organization_id: organizationId,
      nombre,
      especialidad_origen: especialidad,
    }))
  )
}

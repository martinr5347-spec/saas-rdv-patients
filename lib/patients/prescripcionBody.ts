import { PrescripcionMedicamento } from '@/lib/pdf/prescripcionPdf'

// Partage entre POST (app/api/patients/[id]/prescripciones/route.ts) et PUT
// (app/api/patients/[id]/prescripciones/[prescripcionId]/route.ts) -- meme validation pour creer
// ou mettre a jour un brouillon. Un route.ts Next.js ne peut exporter que les noms de handlers
// reconnus (GET/POST/...), d'ou ce petit module separe plutot qu'un export supplementaire direct
// depuis l'un des deux route.ts.
export function parsePrescripcionBody(
  body: Record<string, unknown>
): { fecha: string; medicamentos: PrescripcionMedicamento[]; notasAdicionales: string | null } | { error: string } {
  const fecha = body.fecha as string | undefined
  const medicamentosRaw = Array.isArray(body.medicamentos) ? body.medicamentos : []
  const notasAdicionales = typeof body.notasAdicionales === 'string' ? body.notasAdicionales.trim() || null : null

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { error: 'Fecha inválida' }
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
    return { error: 'Agrega al menos un medicamento con nombre' }
  }

  return { fecha, medicamentos, notasAdicionales }
}

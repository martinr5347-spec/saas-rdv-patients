import { createClient } from '@/lib/supabase/server'
import PatientsView from './PatientsView'

export default async function PatientsPage() {
  const supabase = createClient()
  const { data: patients } = await supabase
    .from('patients')
    .select('id, nom, email, telefono')
    .order('nom')

  // Dernier RDV : tous statuts confondus (un RDV a venir ou annule reste une info utile de
  // "dernier contact"), pas besoin de monto_acompte/statut pour ce calcul.
  const { data: appointments } = await supabase.from('appointments').select('patient_id, fecha_cita')

  // actos_realizados (migration 038) est la vraie source de verite pour "ce que le praticien a
  // facture/touche pour ce patient" -- pas appointments.monto_acompte (acompte de reservation
  // seulement) ni ingresos_manuales (pas de patient_id fiable, texte libre paciente_nombre).
  const { data: actosRealizados } = await supabase.from('actos_realizados').select('patient_id, monto, fecha')

  const { data: orgSettings } = await supabase.from('org_settings').select('monnaie').maybeSingle()

  const ultimoRdvByPatient = new Map<string, string>()
  for (const appt of appointments ?? []) {
    const current = ultimoRdvByPatient.get(appt.patient_id)
    if (!current || appt.fecha_cita > current) {
      ultimoRdvByPatient.set(appt.patient_id, appt.fecha_cita)
    }
  }

  const ultimoMontoByPatient = new Map<string, { monto: number; fecha: string }>()
  const montoCumuladoByPatient = new Map<string, number>()
  for (const acto of actosRealizados ?? []) {
    const monto = Number(acto.monto)
    montoCumuladoByPatient.set(acto.patient_id, (montoCumuladoByPatient.get(acto.patient_id) ?? 0) + monto)

    const current = ultimoMontoByPatient.get(acto.patient_id)
    if (!current || acto.fecha > current.fecha) {
      ultimoMontoByPatient.set(acto.patient_id, { monto, fecha: acto.fecha })
    }
  }

  const patientsConDatos = (patients ?? []).map((p) => ({
    ...p,
    ultimoRdv: ultimoRdvByPatient.get(p.id) ?? null,
    ultimoMonto: ultimoMontoByPatient.get(p.id)?.monto ?? null,
    montoCumulado: montoCumuladoByPatient.has(p.id) ? montoCumuladoByPatient.get(p.id)! : null,
  }))

  return <PatientsView patients={patientsConDatos} monnaie={orgSettings?.monnaie ?? 'PEN'} />
}

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
  // facture/touche a la main pour ce patient" -- pas ingresos_manuales (pas de patient_id fiable,
  // texte libre paciente_nombre).
  const { data: actosRealizados } = await supabase.from('actos_realizados').select('patient_id, monto, fecha')

  // Paiements MercadoPago du patient (automatiques, distincts des actos_realizados saisis a la
  // main) -- meme fusion que ActosRealizadosCard (app/api/patients/[id]/actos/route.ts) et
  // /dashboard/ingresos, a l'echelle de la liste. statut='pagado' uniquement : un acompte non
  // paye n'est pas de l'argent reellement recu.
  const { data: pagosMp } = await supabase
    .from('appointments')
    .select('patient_id, monto_acompte, fecha_pago')
    .eq('statut', 'pagado')

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

  function registrarPago(patientId: string, monto: number, fecha: string) {
    montoCumuladoByPatient.set(patientId, (montoCumuladoByPatient.get(patientId) ?? 0) + monto)
    const current = ultimoMontoByPatient.get(patientId)
    if (!current || fecha > current.fecha) {
      ultimoMontoByPatient.set(patientId, { monto, fecha })
    }
  }

  for (const acto of actosRealizados ?? []) {
    registrarPago(acto.patient_id, Number(acto.monto), acto.fecha)
  }
  for (const pago of pagosMp ?? []) {
    // fecha_pago est un timestamptz -- tronque a la date pour rester comparable a actos.fecha
    // (colonne date) dans le meme Map "le plus recent par date".
    registrarPago(pago.patient_id, Number(pago.monto_acompte), (pago.fecha_pago ?? '').slice(0, 10))
  }

  const patientsConDatos = (patients ?? []).map((p) => ({
    ...p,
    ultimoRdv: ultimoRdvByPatient.get(p.id) ?? null,
    ultimoMonto: ultimoMontoByPatient.get(p.id)?.monto ?? null,
    montoCumulado: montoCumuladoByPatient.has(p.id) ? montoCumuladoByPatient.get(p.id)! : null,
  }))

  return <PatientsView patients={patientsConDatos} monnaie={orgSettings?.monnaie ?? 'PEN'} />
}

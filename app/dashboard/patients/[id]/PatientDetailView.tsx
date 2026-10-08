'use client'

import Link from 'next/link'
import Badge from '@/components/ui/Badge'

const STATUS_BADGE = {
  pendiente: 'warning',
  confirmado: 'success',
  en_curso: 'brand',
  pagado: 'success',
  anulado: 'error',
} as const

export function PatientNotFound() {
  return <div className="text-error-600">Paciente no encontrado.</div>
}

export default function PatientDetailView({
  patient,
  appointments,
  presenceRate,
  totalAppointments,
  markedAppointments,
}: {
  patient: { id: string; nom: string; email: string | null; telefono: string | null; created_at: string }
  appointments: Array<{
    id: string
    fecha_cita: string
    hora_cita: string
    statut: string
    presente: boolean | null
    monto_acompte: number
  }>
  presenceRate: number | null
  totalAppointments: number
  markedAppointments: number
}) {
  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-[#6926D2]">
            {patient.nom.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{patient.nom}</h1>
            <p className="text-sm text-gray-500">
              {patient.email ?? 'Sin email'} · {patient.telefono ?? 'Sin teléfono'}
            </p>
          </div>
        </div>
        <Link href="/dashboard/patients" className="text-sm text-[#6926D2] hover:underline">
          ← Volver
        </Link>
      </div>

      {/* Stats en ligne */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-semibold text-gray-900">{totalAppointments}</p>
          <p className="mt-1 text-xs text-gray-500">Citas totales</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-semibold text-gray-900">
            {presenceRate !== null ? `${presenceRate}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-500">Tasa de asistencia</p>
          {presenceRate !== null && <p className="mt-0.5 text-xs text-gray-400">{markedAppointments} marcadas</p>}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-semibold text-gray-900">
            {appointments.filter((a) => a.presente === false).length}
          </p>
          <p className="mt-1 text-xs text-gray-500">No-shows</p>
        </div>
      </div>

      {/* Historique des RDV */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-800">Historial de citas</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {appointments.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-gray-400">Sin citas registradas.</p>
          )}
          {appointments.map((appt) => (
            <Link
              key={appt.id}
              href={`/dashboard/appointments/${appt.id}`}
              className="group flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <span className="text-lg">
                  {appt.presente === true ? '✓' : appt.presente === false ? '✗' : '·'}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {appt.fecha_cita} a las {appt.hora_cita}
                  </p>
                  <p className="text-xs text-gray-400">
                    {appt.presente === true ? 'Presente' : appt.presente === false ? 'Ausente' : 'Sin marcar'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge color={STATUS_BADGE[appt.statut as keyof typeof STATUS_BADGE] ?? 'gray'}>{appt.statut}</Badge>
                <span className="text-gray-300 group-hover:text-gray-400">›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

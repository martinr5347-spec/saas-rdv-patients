'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'

const STATUS_BADGE = {
  pendiente: 'warning',
  confirmado: 'success',
  pagado: 'success',
  anulado: 'error',
} as const

export interface NotificationRow {
  id: string
  canal: string
  type: string
  statut: string
  error_message: string | null
  sent_at: string | null
}

export interface AppointmentDetail {
  id: string
  fecha_cita: string
  hora_cita: string
  statut: string
  monto_acompte: number
  notas: string | null
  link_pago: string | null
  presente: boolean | null
}

function PresenceToggle({ appointmentId, presente }: { appointmentId: string; presente: boolean | null }) {
  const [value, setValue] = useState<boolean | null>(presente)
  const [loading, setLoading] = useState(false)

  const mark = async (val: boolean) => {
    setLoading(true)
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presente: val }),
    })
    if (res.ok) {
      setValue(val)
      toast.success(val ? 'Asistencia registrada — Presente' : 'Asistencia registrada — Ausente')
    } else {
      toast.error('Error al registrar la asistencia. Intenta de nuevo.')
    }
    setLoading(false)
  }

  return (
    <div className="mt-4">
      <span className="mb-2 block text-sm text-gray-500">Asistencia</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => mark(true)}
          disabled={loading}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
            value === true
              ? 'border-green-300 bg-green-50 text-[#059669]'
              : 'border-gray-200 bg-white text-gray-500 hover:border-green-300 hover:text-[#059669]'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Presente
        </button>
        <button
          type="button"
          onClick={() => mark(false)}
          disabled={loading}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
            value === false
              ? 'border-red-300 bg-red-50 text-red-600'
              : 'border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:text-red-600'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Ausente
        </button>
      </div>
      {value === null && (
        <p className="mt-1 text-xs text-gray-400">Marcar la asistencia ayuda a generar estadísticas precisas.</p>
      )}
    </div>
  )
}

export function AppointmentNotFound() {
  const t = useTranslations('dashboard.appointmentDetail')
  return <div className="text-error-600">{t('notFound')}</div>
}

export default function AppointmentDetailView({
  appointment,
  patient,
  notifications,
}: {
  appointment: AppointmentDetail
  patient: { nom: string; email: string | null; telefono: string | null } | null
  notifications: NotificationRow[]
}) {
  const t = useTranslations('dashboard.appointmentDetail')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">{t('title')}</h1>
        <Link href="/dashboard/appointments" className="text-sm text-brand-600 hover:underline">
          {t('backToList')}
        </Link>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">{t('patient')}</span><p className="font-medium text-gray-800">{patient?.nom}</p></div>
          <div><span className="text-gray-500">{t('email')}</span><p className="text-gray-800">{patient?.email ?? '-'}</p></div>
          <div><span className="text-gray-500">{t('phone')}</span><p className="text-gray-800">{patient?.telefono ?? '-'}</p></div>
          <div><span className="text-gray-500">{t('dateTime')}</span><p className="text-gray-800">{appointment.fecha_cita} {t('at')} {appointment.hora_cita}</p></div>
          <div><span className="text-gray-500">{t('status')}</span><p><Badge color={STATUS_BADGE[appointment.statut as keyof typeof STATUS_BADGE] ?? 'gray'}>{appointment.statut}</Badge></p></div>
          <div><span className="text-gray-500">{t('deposit')}</span><p className="text-gray-800">{appointment.monto_acompte}</p></div>
        </div>

        {appointment.notas && (
          <div className="mt-4">
            <span className="text-gray-500 text-sm">{t('notes')}</span>
            <p className="mt-1 text-gray-800">{appointment.notas}</p>
          </div>
        )}

        {appointment.link_pago && ['pendiente', 'confirmado'].includes(appointment.statut) && (
          <div className="mt-4">
            <span className="text-gray-500 text-sm">{t('paymentLink')}</span>
            <a href={appointment.link_pago} target="_blank" rel="noopener noreferrer" className="block text-brand-600 hover:underline break-all">
              {appointment.link_pago}
            </a>
          </div>
        )}

        <PresenceToggle appointmentId={appointment.id} presente={appointment.presente} />
      </Card>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>{t('channel')}</TableCell>
              <TableCell isHeader>{t('type')}</TableCell>
              <TableCell isHeader>{t('status')}</TableCell>
              <TableCell isHeader>{t('sentAt')}</TableCell>
              <TableCell isHeader>{t('error')}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-gray-500">{t('noNotifications')}</TableCell>
              </TableRow>
            )}
            {notifications.map((n) => (
              <TableRow key={n.id}>
                <TableCell>{n.canal}</TableCell>
                <TableCell>{n.type}</TableCell>
                <TableCell>
                  <Badge color={n.statut === 'sent' ? 'success' : n.statut === 'failed' ? 'error' : 'gray'}>{n.statut}</Badge>
                </TableCell>
                <TableCell>{n.sent_at ? new Date(n.sent_at).toLocaleString() : '-'}</TableCell>
                <TableCell className="text-error-600">{n.error_message ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}

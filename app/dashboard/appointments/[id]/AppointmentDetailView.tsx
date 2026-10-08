'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'

const STATUS_BADGE = {
  pendiente: 'warning',
  confirmado: 'success',
  en_curso: 'brand',
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
  fecha_cita: string
  hora_cita: string
  statut: string
  monto_acompte: number
  notas: string | null
  link_pago: string | null
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

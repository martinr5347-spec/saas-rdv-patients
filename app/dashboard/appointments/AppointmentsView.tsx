'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'
import AppointmentsCalendarView, { type PaidAppointment } from './AppointmentsCalendarView'

const STATUS_BADGE = {
  pendiente: 'warning',
  confirmado: 'success',
  en_curso: 'brand',
  pagado: 'success',
  anulado: 'error',
} as const

export interface AppointmentRow {
  id: string
  fecha_cita: string
  hora_cita: string
  statut: string
  monto_acompte: number
  patients: { nom: string } | null
}

export default function AppointmentsView({
  appointments,
  paidAppointments,
  error,
  statut,
  depuis,
  jusquau,
}: {
  appointments: AppointmentRow[]
  paidAppointments: PaidAppointment[]
  error: string | null
  statut: string
  depuis: string
  jusquau: string
}) {
  const t = useTranslations('dashboard.appointments')
  const [view, setView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-800">{t('title')}</h1>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('viewList')}
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'calendar' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('viewCalendar')}
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <Card>
          <AppointmentsCalendarView appointments={paidAppointments} />
        </Card>
      ) : (
        <>
          <Card>
            <form method="get" className="flex flex-wrap gap-4">
              <select name="statut" defaultValue={statut} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400">
                <option value="">{t('allStatuses')}</option>
                <option value="pendiente">Pendiente</option>
                <option value="confirmado">Confirmado</option>
                <option value="en_curso">En curso</option>
                <option value="pagado">Pagado</option>
                <option value="anulado">Anulado</option>
              </select>
              <input name="depuis" type="date" defaultValue={depuis} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
              <input name="jusquau" type="date" defaultValue={jusquau} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                {t('filter')}
              </button>
            </form>
          </Card>

          {error && <p className="text-error-600 text-sm">{error}</p>}

          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader>{t('colPatient')}</TableCell>
                  <TableCell isHeader>{t('colDate')}</TableCell>
                  <TableCell isHeader>{t('colTime')}</TableCell>
                  <TableCell isHeader>{t('colStatus')}</TableCell>
                  <TableCell isHeader>{t('colDeposit')}</TableCell>
                  <TableCell isHeader></TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-gray-500">
                      {t('none')}
                    </TableCell>
                  </TableRow>
                )}
                {appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.patients?.nom ?? '-'}</TableCell>
                    <TableCell>{a.fecha_cita}</TableCell>
                    <TableCell>{a.hora_cita}</TableCell>
                    <TableCell>
                      <Badge color={STATUS_BADGE[a.statut as keyof typeof STATUS_BADGE] ?? 'gray'}>{a.statut}</Badge>
                    </TableCell>
                    <TableCell>{a.monto_acompte}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/appointments/${a.id}`} className="text-brand-600 hover:underline font-medium">
                        {t('details')}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </div>
  )
}

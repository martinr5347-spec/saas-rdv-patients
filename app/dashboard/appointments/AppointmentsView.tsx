'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'
import AppointmentsCalendarView, { type PaidAppointment } from './AppointmentsCalendarView'
import { computeParetoInsight, type ActoRealizadoRow } from '@/lib/analytics/pareto'

const STATUS_BADGE = {
  pendiente: 'warning',
  confirmado: 'success',
  pagado: 'success',
  anulado: 'error',
} as const

const STATUS_LABEL_KEY: Record<string, string> = {
  pendiente: 'statutPendiente',
  confirmado: 'statutConfirmado',
  pagado: 'statutPagado',
  anulado: 'statutAnulado',
}

export interface AppointmentRow {
  id: string
  fecha_cita: string
  hora_cita: string
  statut: string
  monto_acompte: number
  patients: { nom: string } | null
}

// Mini-resume "top traitements" (esprit Pareto de analisis/AnalisisView.tsx, sans le detail
// complet) -- seulement le TOP 3 par chiffre d'affaires, rien si aucun acte ce mois-ci.
function TopTratamientosCard({ actosDelMes }: { actosDelMes: ActoRealizadoRow[] }) {
  const t = useTranslations('dashboard.appointments')
  const { porMonto } = computeParetoInsight(actosDelMes)

  if (porMonto.length === 0) return null

  const top3 = porMonto.slice(0, 3)

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">{t('topTratamientosTitle')}</h2>
        <Link href="/dashboard/analisis" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          {t('verAnalisisCompleto')}
        </Link>
      </div>
      <div className="mt-3 space-y-1.5">
        {top3.map((g) => (
          <div key={g.nombre} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-700">{g.nombre}</span>
            <span className="font-medium text-gray-800">{g.monto.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function AppointmentsView({
  appointments,
  paidAppointments,
  actosDelMes,
  error,
  statut,
  depuis,
  jusquau,
}: {
  appointments: AppointmentRow[]
  paidAppointments: PaidAppointment[]
  actosDelMes: ActoRealizadoRow[]
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
                <option value="pendiente">{t('statutPendiente')}</option>
                <option value="confirmado">{t('statutConfirmado')}</option>
                <option value="pagado">{t('statutPagado')}</option>
                <option value="anulado">{t('statutAnulado')}</option>
              </select>
              <input name="depuis" type="date" defaultValue={depuis} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
              <input name="jusquau" type="date" defaultValue={jusquau} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                {t('filter')}
              </button>
            </form>
          </Card>

          <TopTratamientosCard actosDelMes={actosDelMes} />

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
                      <Badge color={STATUS_BADGE[a.statut as keyof typeof STATUS_BADGE] ?? 'gray'}>
                        {STATUS_LABEL_KEY[a.statut] ? t(STATUS_LABEL_KEY[a.statut]) : a.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.monto_acompte}
                      {a.statut === 'pendiente' && ` ${t('depositoPendienteSuffix')}`}
                    </TableCell>
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

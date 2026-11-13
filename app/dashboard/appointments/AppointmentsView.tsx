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
  confirmado: 'info',
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

type PeriodoTop = 'mes' | 'trimestre' | 'semestre' | 'anio'

const PERIODOS_TOP: { value: PeriodoTop; labelKey: string }[] = [
  { value: 'mes', labelKey: 'periodoMes' },
  { value: 'trimestre', labelKey: 'periodoTrimestre' },
  { value: 'semestre', labelKey: 'periodoSemestre' },
  { value: 'anio', labelKey: 'periodoAnio' },
]

// Or/argent/bronze avec les teintes Tailwind standard deja en place dans le projet (pas de
// palette custom) -- hauteur de pastille degressive (pt-*) pour l'effet podium classique, bas
// aligne via items-end sur le conteneur flex.
const PODIUM_RANK_STYLES: Record<1 | 2 | 3, { badge: string; card: string; padding: string }> = {
  1: { badge: 'bg-amber-400 text-white', card: 'border-amber-200 bg-amber-50', padding: 'pt-7 pb-4' },
  2: { badge: 'bg-gray-400 text-white', card: 'border-gray-200 bg-gray-50', padding: 'pt-4 pb-4' },
  3: { badge: 'bg-amber-700 text-white', card: 'border-amber-100 bg-orange-50', padding: 'pt-2 pb-4' },
}

// Mini-resume "top traitements" (esprit Pareto de analisis/AnalisisView.tsx, sans le detail
// complet) -- seulement le TOP 3 par chiffre d'affaires, rien si aucun acte sur la periode choisie.
function TopTratamientosCard({
  actosDelPeriodo,
  periodoTop,
  statut,
  depuis,
  jusquau,
}: {
  actosDelPeriodo: ActoRealizadoRow[]
  periodoTop: PeriodoTop
  statut: string
  depuis: string
  jusquau: string
}) {
  const t = useTranslations('dashboard.appointments')
  const { porMonto, totalMonto } = computeParetoInsight(actosDelPeriodo)

  if (porMonto.length === 0) return null

  const top3 = porMonto.slice(0, 3)
  // Ordre visuel classique (2e a gauche, 1er au centre et plus haut, 3e a droite) -- seulement
  // les positions reellement occupees, pour ne pas casser le rendu avec 1 ou 2 traitements.
  const slots = (
    [
      top3[1] ? { rank: 2 as const, group: top3[1] } : null,
      top3[0] ? { rank: 1 as const, group: top3[0] } : null,
      top3[2] ? { rank: 3 as const, group: top3[2] } : null,
    ] as const
  ).filter((s): s is { rank: 1 | 2 | 3; group: (typeof top3)[number] } => s !== null)

  // periodoTop est une fenetre independante du filtre statut/depuis/jusquau du tableau de RDV
  // (celui-la reste inchange) -- on le preserve dans l'URL pour ne pas le reinitialiser au clic.
  const hrefPeriodo = (p: PeriodoTop) => {
    const params = new URLSearchParams()
    if (statut) params.set('statut', statut)
    if (depuis) params.set('depuis', depuis)
    if (jusquau) params.set('jusquau', jusquau)
    params.set('periodoTop', p)
    return `/dashboard/appointments?${params.toString()}`
  }

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">{t('topTratamientosTitle')}</h2>
          <p className="text-xs text-gray-400">{t('topTratamientosSubtitle')}</p>
        </div>
        <Link href="/dashboard/analisis" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          {t('verAnalisisCompleto')}
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PERIODOS_TOP.map((p) => (
          <Link
            key={p.value}
            href={hrefPeriodo(p.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              periodoTop === p.value ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t(p.labelKey)}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex items-end justify-center gap-3">
        {slots.map(({ rank, group }) => {
          const pct = totalMonto > 0 ? Math.round((group.monto / totalMonto) * 100) : 0
          const style = PODIUM_RANK_STYLES[rank]
          return (
            <div
              key={group.nombre}
              className={`flex w-28 flex-col items-center rounded-xl border px-2 ${style.card} ${style.padding}`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${style.badge}`}>
                {rank}
              </span>
              <p className="mt-2 line-clamp-2 text-center text-xs font-medium text-gray-700">{group.nombre}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{group.monto.toFixed(2)}</p>
              <p className="text-[11px] text-gray-500">{pct}%</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function AppointmentsView({
  appointments,
  paidAppointments,
  actosDelPeriodo,
  periodoTop,
  error,
  statut,
  depuis,
  jusquau,
}: {
  appointments: AppointmentRow[]
  paidAppointments: PaidAppointment[]
  actosDelPeriodo: ActoRealizadoRow[]
  periodoTop: PeriodoTop
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

          <TopTratamientosCard actosDelPeriodo={actosDelPeriodo} periodoTop={periodoTop} statut={statut} depuis={depuis} jusquau={jusquau} />

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

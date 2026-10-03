'use client'

import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/ui/StatCard'
import { CashIcon } from '@/components/layout/icons'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'

export interface ManualEntry {
  id: string
  fecha: string
  monto: number
  metodo_pago: 'efectivo' | 'transferencia' | 'otro'
  paciente_nombre: string | null
  concepto: string | null
}

export interface McPayment {
  id: string
  fecha_pago: string | null
  monto_acompte: number
  notas: string | null
  patients: { nom: string } | null
}

type MetodoBadge = 'efectivo' | 'transferencia' | 'otro' | 'mercadopago'

const BADGE_COLOR: Record<MetodoBadge, 'success' | 'gray' | 'brand' | 'warning'> = {
  mercadopago: 'success',
  efectivo: 'gray',
  transferencia: 'brand',
  otro: 'warning',
}

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19 3 20l1-4Z" />
    </svg>
  )
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.1a2 2 0 0 1-2 1.9H9.7a2 2 0 0 1-2-1.9L7 7" />
    </svg>
  )
}

export default function IngresosView({
  periodo,
  monnaie,
  manuales,
  pagosMp,
  editingEntry,
  createAction,
  updateAction,
  deleteAction,
}: {
  periodo: string
  monnaie: string
  manuales: ManualEntry[]
  pagosMp: McPayment[]
  editingEntry: ManualEntry | null
  createAction: (formData: FormData) => void
  updateAction: (formData: FormData) => void
  deleteAction: (formData: FormData) => void
}) {
  const t = useTranslations('dashboard.ingresos')
  const months = t.raw('months') as string[]
  const [ano] = periodo.split('-').map(Number)

  const totalManual = manuales.reduce((sum, m) => sum + Number(m.monto), 0)
  const totalMp = pagosMp.reduce((sum, p) => sum + Number(p.monto_acompte), 0)
  const totalMonth = totalManual + totalMp

  type Row = {
    key: string
    fecha: string
    paciente: string
    concepto: string
    metodo: MetodoBadge
    monto: number
    manual: ManualEntry | null
  }

  const rows: Row[] = [
    ...manuales.map((m) => ({
      key: `manual-${m.id}`,
      fecha: m.fecha,
      paciente: m.paciente_nombre ?? '-',
      concepto: m.concepto ?? '-',
      metodo: m.metodo_pago as MetodoBadge,
      monto: Number(m.monto),
      manual: m,
    })),
    ...pagosMp.map((p) => ({
      key: `mp-${p.id}`,
      fecha: p.fecha_pago ? p.fecha_pago.slice(0, 10) : '-',
      paciente: p.patients?.nom ?? '-',
      concepto: p.notas ?? '-',
      metodo: 'mercadopago' as MetodoBadge,
      monto: Number(p.monto_acompte),
      manual: null,
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

  const metodoLabel: Record<MetodoBadge, string> = {
    efectivo: t('metodoEfectivo'),
    transferencia: t('metodoTransferencia'),
    otro: t('metodoOtro'),
    mercadopago: 'MP',
  }

  function handleDeleteSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm(t('deleteConfirm'))) e.preventDefault()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">{t('title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={`${t('totalMonth')} (${monnaie})`} value={totalMonth.toFixed(2)} icon={<CashIcon className="h-5 w-5" />} />
        <StatCard label={`${t('totalMp')} (${monnaie})`} value={totalMp.toFixed(2)} icon={<CashIcon className="h-5 w-5" />} />
        <StatCard label={`${t('totalManual')} (${monnaie})`} value={totalManual.toFixed(2)} icon={<CashIcon className="h-5 w-5" />} />
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          {editingEntry ? t('formTitleEdit') : t('formTitleCreate')}
        </h2>
        <form action={editingEntry ? updateAction : createAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {editingEntry && <input type="hidden" name="id" value={editingEntry.id} />}
          <input type="hidden" name="periodo" value={periodo} />
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('fieldFecha')}</label>
            <input
              name="fecha"
              type="date"
              required
              defaultValue={editingEntry?.fecha ?? new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('fieldMonto')}</label>
            <input
              name="monto"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={editingEntry?.monto ?? ''}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('fieldMetodo')}</label>
            <select
              name="metodo_pago"
              required
              defaultValue={editingEntry?.metodo_pago ?? 'efectivo'}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="efectivo">{t('metodoEfectivo')}</option>
              <option value="transferencia">{t('metodoTransferencia')}</option>
              <option value="otro">{t('metodoOtro')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('fieldPaciente')}</label>
            <input
              name="paciente_nombre"
              defaultValue={editingEntry?.paciente_nombre ?? ''}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">{t('fieldConcepto')}</label>
            <input
              name="concepto"
              placeholder={t('conceptoPlaceholder')}
              defaultValue={editingEntry?.concepto ?? ''}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              {editingEntry ? t('submitEdit') : t('submitCreate')}
            </button>
            {editingEntry && (
              <a
                href={`/dashboard/ingresos?periodo=${periodo}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('cancelEdit')}
              </a>
            )}
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="get" className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">{t('monthLabel')}</label>
          <select
            name="periodo"
            defaultValue={periodo}
            onChange={(e) => e.currentTarget.form?.submit()}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          >
            {[ano - 1, ano, ano + 1].flatMap((y) =>
              Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={`${y}-${m}`} value={`${y}-${String(m).padStart(2, '0')}`}>
                  {months[m - 1]} {y}
                </option>
              ))
            )}
          </select>
        </form>
        <div className="flex gap-2">
          <a
            href={`/api/ingresos/export?periodo=${periodo}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('exportCsv')}
          </a>
          <a
            href={`/api/ingresos/export-pdf?periodo=${periodo}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('exportPdf')}
          </a>
        </div>
      </div>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>{t('colFecha')}</TableCell>
              <TableCell isHeader>{t('colPaciente')}</TableCell>
              <TableCell isHeader>{t('colConcepto')}</TableCell>
              <TableCell isHeader>{t('colMetodo')}</TableCell>
              <TableCell isHeader>{t('colMonto')}</TableCell>
              <TableCell isHeader></TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-gray-500">
                  {t('none')}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>{row.fecha}</TableCell>
                <TableCell>{row.paciente}</TableCell>
                <TableCell>{row.concepto}</TableCell>
                <TableCell>
                  <Badge color={BADGE_COLOR[row.metodo]}>{metodoLabel[row.metodo]}</Badge>
                </TableCell>
                <TableCell>
                  {monnaie} {row.monto.toFixed(2)}
                </TableCell>
                <TableCell>
                  {row.manual ? (
                    <div className="flex items-center gap-3">
                      <a
                        href={`/dashboard/ingresos?periodo=${periodo}&edit=${row.manual.id}`}
                        aria-label={t('edit')}
                        className="text-gray-500 hover:text-brand-600"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </a>
                      <form action={deleteAction} onSubmit={handleDeleteSubmit}>
                        <input type="hidden" name="id" value={row.manual.id} />
                        <input type="hidden" name="periodo" value={periodo} />
                        <button type="submit" aria-label={t('delete')} className="text-gray-500 hover:text-error-600">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400" title={t('mpNotEditable')}>
                      —
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}

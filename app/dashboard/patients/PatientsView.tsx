'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'
import ImportPatientsModal from './ImportPatientsModal'
import NewPatientModal from './NewPatientModal'

export interface PatientRow {
  id: string
  nom: string
  email: string | null
  telefono: string | null
  ultimoRdv: string | null
  ultimoMonto: number | null
  montoCumulado: number | null
}

type SortColumn = 'nom' | 'ultimoRdv' | 'ultimoMonto' | 'montoCumulado'
type SortDirection = 'asc' | 'desc'

// Normalisation accents/casse pour la recherche ("jose" doit trouver "José") -- jamais d'aller-
// retour serveur, le volume de patients d'un praticien solo reste faible.
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

// fecha_cita/fecha sont des colonnes `date` (YYYY-MM-DD) -- jamais passer par new Date(...) pour
// un simple affichage, le fuseau du navigateur ferait glisser d'un jour selon l'heure locale.
function formatFechaSimple(fecha: string): string {
  const [yyyy, mm, dd] = fecha.split('-')
  return `${dd}/${mm}/${yyyy}`
}

function compareValues(a: PatientRow, b: PatientRow, column: SortColumn): number {
  switch (column) {
    case 'nom':
      return a.nom.localeCompare(b.nom)
    case 'ultimoRdv':
      return (a.ultimoRdv ?? '').localeCompare(b.ultimoRdv ?? '')
    case 'ultimoMonto':
      return (a.ultimoMonto ?? -1) - (b.ultimoMonto ?? -1)
    case 'montoCumulado':
      return (a.montoCumulado ?? -1) - (b.montoCumulado ?? -1)
    default:
      return 0
  }
}

export default function PatientsView({ patients, monnaie }: { patients: PatientRow[]; monnaie: string }) {
  const t = useTranslations('dashboard.patients')
  const router = useRouter()
  const [importOpen, setImportOpen] = useState(false)
  const [newPatientOpen, setNewPatientOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('nom')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const toggleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const filteredAndSorted = useMemo(() => {
    const needle = normalizar(search.trim())
    const filtered = needle ? patients.filter((p) => normalizar(p.nom).includes(needle)) : patients

    const sorted = [...filtered].sort((a, b) => {
      const cmp = compareValues(a, b, sortColumn)
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [patients, search, sortColumn, sortDirection])

  const formatMonto = (monto: number | null) => (monto === null ? '-' : `${monnaie} ${monto.toFixed(2)}`)

  const SortArrow = ({ column }: { column: SortColumn }) => {
    if (column !== sortColumn) return null
    return <span className="ml-1 text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
  }

  const SortableHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <TableCell isHeader>
      <button type="button" onClick={() => toggleSort(column)} className="flex items-center hover:text-gray-700">
        {label}
        <SortArrow column={column} />
      </button>
    </TableCell>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">{t('title')}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setNewPatientOpen(true)}
            className="rounded-xl bg-[#6926D2] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98]"
          >
            {t('newPatientButton')}
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-xl border border-[#6926D2] px-4 py-2 text-sm font-medium text-[#6926D2] transition-all hover:bg-[#6926D2]/5 active:scale-[0.98]"
          >
            {t('importButton')}
          </button>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
      />

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="nom" label={t('colName')} />
              <TableCell isHeader>{t('colEmail')}</TableCell>
              <TableCell isHeader>{t('colPhone')}</TableCell>
              <SortableHeader column="ultimoRdv" label={t('colUltimoRdv')} />
              <SortableHeader column="ultimoMonto" label={t('colUltimoMonto')} />
              <SortableHeader column="montoCumulado" label={t('colMontoAcumulado')} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400">
                  {t('sinResultadosBusqueda')}
                </TableCell>
              </TableRow>
            )}
            {filteredAndSorted.map((p) => (
              <TableRow key={p.id} className="cursor-pointer">
                <TableCell className="font-medium text-gray-800">
                  <Link href={`/dashboard/patients/${p.id}`} className="block hover:text-[#6926D2]">
                    {p.nom}
                  </Link>
                </TableCell>
                <TableCell>{p.email ?? '-'}</TableCell>
                <TableCell>{p.telefono ?? '-'}</TableCell>
                <TableCell>{p.ultimoRdv ? formatFechaSimple(p.ultimoRdv) : '-'}</TableCell>
                <TableCell>{formatMonto(p.ultimoMonto)}</TableCell>
                <TableCell>{formatMonto(p.montoCumulado)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {importOpen && (
        <ImportPatientsModal
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false)
            router.refresh()
          }}
        />
      )}
      {newPatientOpen && (
        <NewPatientModal
          onClose={() => setNewPatientOpen(false)}
          onCreated={() => {
            setNewPatientOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

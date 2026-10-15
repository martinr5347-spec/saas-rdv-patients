'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'
import ImportPatientsModal from './ImportPatientsModal'

export interface PatientRow {
  id: string
  nom: string
  email: string | null
  telefono: string | null
}

export default function PatientsView({ patients }: { patients: PatientRow[] }) {
  const t = useTranslations('dashboard.patients')
  const router = useRouter()
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">{t('title')}</h1>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="rounded-xl bg-[#6926D2] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98]"
        >
          Importar pacientes
        </button>
      </div>
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>{t('colName')}</TableCell>
              <TableCell isHeader>{t('colEmail')}</TableCell>
              <TableCell isHeader>{t('colPhone')}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p) => (
              <TableRow key={p.id} className="cursor-pointer">
                <TableCell className="font-medium text-gray-800">
                  <Link href={`/dashboard/patients/${p.id}`} className="block hover:text-[#6926D2]">
                    {p.nom}
                  </Link>
                </TableCell>
                <TableCell>{p.email ?? '-'}</TableCell>
                <TableCell>{p.telefono ?? '-'}</TableCell>
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
    </div>
  )
}

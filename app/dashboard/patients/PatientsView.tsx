'use client'

import { useTranslations } from 'next-intl'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'

export interface PatientRow {
  id: string
  nom: string
  email: string | null
  telefono: string | null
}

export default function PatientsView({ patients }: { patients: PatientRow[] }) {
  const t = useTranslations('dashboard.patients')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800">{t('title')}</h1>
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
              <TableRow key={p.id}>
                <TableCell className="font-medium text-gray-800">{p.nom}</TableCell>
                <TableCell>{p.email ?? '-'}</TableCell>
                <TableCell>{p.telefono ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}

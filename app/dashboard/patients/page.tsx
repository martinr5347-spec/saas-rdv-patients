import { createClient } from '@/lib/supabase/server'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'

export default async function PatientsPage() {
  const supabase = createClient()
  const { data: patients } = await supabase
    .from('patients')
    .select('id, nom, email, telefono')
    .order('nom')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800">Patients</h1>
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Nom</TableCell>
              <TableCell isHeader>Email</TableCell>
              <TableCell isHeader>Téléphone</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(patients ?? []).map((p) => (
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

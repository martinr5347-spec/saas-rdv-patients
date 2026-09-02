import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'

const STATUS_BADGE = {
  pendiente: 'warning',
  pagado: 'success',
  anulado: 'error',
} as const

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: { statut?: string; depuis?: string; jusquau?: string }
}) {
  const supabase = createClient()

  let query = supabase
    .from('appointments')
    .select('id, fecha_cita, hora_cita, statut, monto_acompte, patients(nom)')
    .order('fecha_cita', { ascending: false })

  const statuts = ['pendiente', 'pagado', 'anulado'] as const
  if (searchParams.statut && statuts.includes(searchParams.statut as typeof statuts[number])) {
    query = query.eq('statut', searchParams.statut as typeof statuts[number])
  }
  if (searchParams.depuis) query = query.gte('fecha_cita', searchParams.depuis)
  if (searchParams.jusquau) query = query.lte('fecha_cita', searchParams.jusquau)

  const { data: appointments, error } = await query

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800">Rendez-vous</h1>

      <Card>
        <form method="get" className="flex flex-wrap gap-4">
          <select name="statut" defaultValue={searchParams.statut ?? ''} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400">
            <option value="">Tous les statuts</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="anulado">Anulado</option>
          </select>
          <input name="depuis" type="date" defaultValue={searchParams.depuis ?? ''} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
          <input name="jusquau" type="date" defaultValue={searchParams.jusquau ?? ''} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
          <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Filtrer
          </button>
        </form>
      </Card>

      {error && <p className="text-error-600 text-sm">{error.message}</p>}

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Patient</TableCell>
              <TableCell isHeader>Date</TableCell>
              <TableCell isHeader>Heure</TableCell>
              <TableCell isHeader>Statut</TableCell>
              <TableCell isHeader>Acompte</TableCell>
              <TableCell isHeader></TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(appointments ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-gray-500">
                  Aucun rendez-vous.
                </TableCell>
              </TableRow>
            )}
            {(appointments ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell>{(a.patients as { nom: string } | null)?.nom ?? '-'}</TableCell>
                <TableCell>{a.fecha_cita}</TableCell>
                <TableCell>{a.hora_cita}</TableCell>
                <TableCell>
                  <Badge color={STATUS_BADGE[a.statut as keyof typeof STATUS_BADGE] ?? 'gray'}>{a.statut}</Badge>
                </TableCell>
                <TableCell>{a.monto_acompte}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/appointments/${a.id}`} className="text-brand-600 hover:underline font-medium">
                    Détails
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}

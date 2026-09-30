import { createClient } from '@/lib/supabase/server'
import PatientsView from './PatientsView'

export default async function PatientsPage() {
  const supabase = createClient()
  const { data: patients } = await supabase
    .from('patients')
    .select('id, nom, email, telefono')
    .order('nom')

  return <PatientsView patients={patients ?? []} />
}

import { createServiceRoleClient } from '@/lib/supabase/admin'
import GestionarView from './GestionarView'
import esMessages from '@/messages/es.json'
import ptMessages from '@/messages/pt.json'

export default async function GestionarPage({ params }: { params: { token: string } }) {
  const supabase = createServiceRoleClient()

  const { data: appt } = await supabase
    .from('appointments')
    .select('organizations(nom, langue)')
    .eq('gestion_token', params.token)
    .maybeSingle()

  const org = appt?.organizations as unknown as { nom: string; langue: string } | null

  const messages = org?.langue === 'pt' ? ptMessages : esMessages

  if (!org) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8] px-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-600">{messages.booking.notFound}</p>
        </div>
      </div>
    )
  }

  return <GestionarView token={params.token} organizationNombre={org.nom} langue={org.langue as 'es' | 'pt'} />
}

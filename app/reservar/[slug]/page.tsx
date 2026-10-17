import { createServiceRoleClient } from '@/lib/supabase/admin'
import ReservaView from './ReservaView'
import esMessages from '@/messages/es.json'
import ptMessages from '@/messages/pt.json'

export default async function ReservaPage({ params }: { params: { slug: string } }) {
  const supabase = createServiceRoleClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, nom, langue, pays')
    .eq('slug', params.slug)
    .maybeSingle()

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

  return <ReservaView organizationNombre={org.nom} organizationPais={org.pays} slug={params.slug} langue={org.langue as 'es' | 'pt'} />
}

import { createServiceRoleClient } from '@/lib/supabase/admin'
import ReservaView from './ReservaView'
import esMessages from '@/messages/es.json'
import ptMessages from '@/messages/pt.json'

// Sans ceci, Next.js met en cache le rendu de cette page (le fetch interne du client Supabase
// passe par le fetch patche par Next et se fait mettre en cache par le Data Cache) -- un
// changement de slug (app/dashboard/disponibilidad/actions.ts) ne revalide pas ce chemin, une
// page deja visitee avant le changement resterait alors figee sur l'ancienne organisation au lieu
// de refleter le nouveau mapping slug -> organisation. `dynamic` seul ne suffit pas a desactiver
// le Data Cache dans cette configuration -- verifie empiriquement, d'ou l'ajout explicite de
// fetchCache.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function ReservaPage({ params }: { params: { slug: string } }) {
  const supabase = createServiceRoleClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, nom, langue, pays, adresse')
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

  // Un seul praticien par organisation (cible produit actuelle : cabinet individuel) -- pas
  // besoin de gerer plusieurs photos. maybeSingle() renvoie null proprement si aucun praticien
  // n'est trouve, la page ne doit pas planter dans ce cas.
  const { data: praticien } = await supabase
    .from('users')
    .select('foto_url')
    .eq('organization_id', org.id)
    .eq('role', 'praticien')
    .maybeSingle()

  return (
    <ReservaView
      organizationNombre={org.nom}
      organizationPais={org.pays}
      organizationAdresse={org.adresse}
      fotoUrl={praticien?.foto_url ?? null}
      slug={params.slug}
      langue={org.langue as 'es' | 'pt'}
    />
  )
}

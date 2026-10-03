import { createClient } from '@/lib/supabase/server'
import SettingsView from './SettingsView'
import { updateSettings, openBillingPortal } from './actions'

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, nombre_completo, especialidad, foto_url')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const { data: settings } = await supabase
    .from('org_settings')
    .select('*')
    .eq('organization_id', profile?.organization_id ?? '')
    .maybeSingle()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, statut')
    .eq('organization_id', profile?.organization_id ?? '')
    .maybeSingle()

  const { data: organization } = await supabase
    .from('organizations')
    .select('langue, adresse')
    .eq('id', profile?.organization_id ?? '')
    .maybeSingle()

  return (
    <SettingsView
      settings={settings}
      subscriptionStatut={subscription?.statut ?? null}
      hasStripeCustomer={Boolean(subscription?.stripe_customer_id)}
      organizationLangue={organization?.langue ?? null}
      organizationAdresse={organization?.adresse ?? null}
      nombreCompleto={profile?.nombre_completo ?? null}
      especialidadTexto={profile?.especialidad ?? null}
      fotoUrl={profile?.foto_url ?? null}
      updateSettingsAction={updateSettings}
      openBillingPortalAction={openBillingPortal}
    />
  )
}

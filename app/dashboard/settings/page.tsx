import { createClient } from '@/lib/supabase/server'
import SettingsView from './SettingsView'
import {
  updateSettings,
  openBillingPortal,
  updateCategoriasNotas,
  updateCategoriasConFoto,
  updateMpAccessToken,
  updateTwilioSettings,
} from './actions'
import { decryptSecret } from '@/lib/crypto/settingsEncryption'

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, nombre_completo, especialidad, foto_url, codigo_seguridad_updated_at')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  // IMPORTANT : jamais select('*') ici -- mp_access_token/twilio_auth_token_encrypted ne doivent
  // jamais atteindre le payload envoyé au client. Sélectionnés explicitement ci-dessous uniquement
  // pour calculer les indicateurs "configuré/termine en" côté serveur, puis exclus de l'objet
  // `settings` transmis à la vue.
  const { data: settingsRaw } = await supabase
    .from('org_settings')
    .select(
      'delai_paiement_h, delai_aviso_h, delai_rappel_h, monto_acompte, costo_total, monnaie, calendly_url, unipile_account_id, mp_access_token, mp_notification_url, canal_email, canal_whatsapp, canal_whatsapp_provider, twilio_subaccount_sid, twilio_whatsapp_number, twilio_auth_token_encrypted, variantes_mensaje, categorias_notas, categorias_con_foto, variante_control_recall, control_recall_anticipacion_dias'
    )
    .eq('organization_id', profile?.organization_id ?? '')
    .maybeSingle()

  const mpTokenConfigured = !!settingsRaw?.mp_access_token
  let mpTokenLast4: string | null = null
  if (settingsRaw?.mp_access_token) {
    try {
      mpTokenLast4 = decryptSecret(settingsRaw.mp_access_token).slice(-4)
    } catch (e) {
      // Valeur stockée avant le chiffrement (legacy en clair) ou corrompue -- ne pas planter la
      // page pour autant, juste ne pas afficher les 4 derniers chiffres.
      console.error('Erreur déchiffrement mp_access_token:', e)
    }
  }

  const twilioAuthTokenConfigured = !!settingsRaw?.twilio_auth_token_encrypted
  let twilioAuthTokenLast4: string | null = null
  if (settingsRaw?.twilio_auth_token_encrypted) {
    try {
      twilioAuthTokenLast4 = decryptSecret(settingsRaw.twilio_auth_token_encrypted).slice(-4)
    } catch (e) {
      console.error('Erreur déchiffrement twilio_auth_token_encrypted:', e)
    }
  }

  const settings = settingsRaw
    ? {
        delai_paiement_h: settingsRaw.delai_paiement_h,
        delai_aviso_h: settingsRaw.delai_aviso_h,
        delai_rappel_h: settingsRaw.delai_rappel_h,
        monto_acompte: settingsRaw.monto_acompte,
        costo_total: settingsRaw.costo_total,
        monnaie: settingsRaw.monnaie,
        calendly_url: settingsRaw.calendly_url,
        unipile_account_id: settingsRaw.unipile_account_id,
        mp_notification_url: settingsRaw.mp_notification_url,
        canal_email: settingsRaw.canal_email,
        canal_whatsapp: settingsRaw.canal_whatsapp,
        canal_whatsapp_provider: settingsRaw.canal_whatsapp_provider,
        twilio_subaccount_sid: settingsRaw.twilio_subaccount_sid,
        twilio_whatsapp_number: settingsRaw.twilio_whatsapp_number,
        variantes_mensaje: settingsRaw.variantes_mensaje,
        categorias_notas: settingsRaw.categorias_notas,
        categorias_con_foto: settingsRaw.categorias_con_foto,
        variante_control_recall: settingsRaw.variante_control_recall,
        control_recall_anticipacion_dias: settingsRaw.control_recall_anticipacion_dias,
      }
    : null

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, statut')
    .eq('organization_id', profile?.organization_id ?? '')
    .maybeSingle()

  const { data: organization } = await supabase
    .from('organizations')
    .select('langue, adresse, pays')
    .eq('id', profile?.organization_id ?? '')
    .maybeSingle()

  return (
    <SettingsView
      settings={settings}
      subscriptionStatut={subscription?.statut ?? null}
      hasStripeCustomer={Boolean(subscription?.stripe_customer_id)}
      organizationLangue={organization?.langue ?? null}
      organizationAdresse={organization?.adresse ?? null}
      organizationPays={organization?.pays ?? null}
      nombreCompleto={profile?.nombre_completo ?? null}
      especialidadTexto={profile?.especialidad ?? null}
      fotoUrl={profile?.foto_url ?? null}
      codigoSeguridadUpdatedAt={profile?.codigo_seguridad_updated_at ?? null}
      mpTokenConfigured={mpTokenConfigured}
      mpTokenLast4={mpTokenLast4}
      twilioAuthTokenConfigured={twilioAuthTokenConfigured}
      twilioAuthTokenLast4={twilioAuthTokenLast4}
      updateSettingsAction={updateSettings}
      openBillingPortalAction={openBillingPortal}
      updateCategoriasNotasAction={updateCategoriasNotas}
      updateCategoriasConFotoAction={updateCategoriasConFoto}
      updateMpAccessTokenAction={updateMpAccessToken}
      updateTwilioSettingsAction={updateTwilioSettings}
    />
  )
}

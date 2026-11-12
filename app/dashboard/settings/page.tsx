import { createClient } from '@/lib/supabase/server'
import SettingsView from './SettingsView'
import {
  updateProfile,
  updateFacturacion,
  updateIntegraciones,
  updateCanales,
  updatePlantillas,
  openBillingPortal,
  updateCategoriasNotas,
  updateCategoriasConFoto,
  updateMpAccessToken,
  updateActoPrecios,
} from './actions'
import { decryptSecret } from '@/lib/crypto/settingsEncryption'

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, nombre_completo, especialidad, numero_colegiatura, foto_url, codigo_seguridad_updated_at')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  // IMPORTANT : jamais select('*') ici -- mp_access_token ne doit jamais atteindre le payload
  // envoyé au client. Sélectionné explicitement ci-dessous uniquement pour calculer l'indicateur
  // "configuré/termine en" côté serveur, puis exclu de l'objet `settings` transmis à la vue.
  // twilio_subaccount_sid/twilio_whatsapp_number/twilio_auth_token_encrypted ne sont plus
  // sélectionnés ici : ces champs ne sont plus affichés ni modifiables depuis cette page (compte
  // Twilio géré par Martin directement en base), seul lib/dispatcher les lit encore.
  const { data: settingsRaw } = await supabase
    .from('org_settings')
    .select(
      'delai_paiement_h, delai_aviso_h, delai_rappel_h, monto_acompte, costo_total, monnaie, calendly_url, mp_access_token, mp_notification_url, canal_email, canal_whatsapp, variantes_mensaje, categorias_notas, categorias_con_foto, variante_control_recall, control_recall_anticipacion_dias, google_review_link, solicitud_resena_activa, solicitud_resena_delay_dias'
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

  const settings = settingsRaw
    ? {
        delai_paiement_h: settingsRaw.delai_paiement_h,
        delai_aviso_h: settingsRaw.delai_aviso_h,
        delai_rappel_h: settingsRaw.delai_rappel_h,
        monto_acompte: settingsRaw.monto_acompte,
        costo_total: settingsRaw.costo_total,
        monnaie: settingsRaw.monnaie,
        calendly_url: settingsRaw.calendly_url,
        mp_notification_url: settingsRaw.mp_notification_url,
        canal_email: settingsRaw.canal_email,
        canal_whatsapp: settingsRaw.canal_whatsapp,
        variantes_mensaje: settingsRaw.variantes_mensaje,
        categorias_notas: settingsRaw.categorias_notas,
        categorias_con_foto: settingsRaw.categorias_con_foto,
        variante_control_recall: settingsRaw.variante_control_recall,
        control_recall_anticipacion_dias: settingsRaw.control_recall_anticipacion_dias,
        google_review_link: settingsRaw.google_review_link,
        solicitud_resena_activa: settingsRaw.solicitud_resena_activa,
        solicitud_resena_delay_dias: settingsRaw.solicitud_resena_delay_dias,
      }
    : null

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, statut')
    .eq('organization_id', profile?.organization_id ?? '')
    .maybeSingle()

  const { data: organization } = await supabase
    .from('organizations')
    .select('langue, adresse, pays, especialidad')
    .eq('id', profile?.organization_id ?? '')
    .maybeSingle()

  const { data: actosRaw } = await supabase
    .from('actos')
    .select('id, nombre, precio_default')
    .eq('organization_id', profile?.organization_id ?? '')
    .eq('activo', true)
    .order('nombre')

  const actos = (actosRaw ?? []).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    precioDefault: a.precio_default !== null ? Number(a.precio_default) : null,
  }))

  return (
    <SettingsView
      settings={settings}
      subscriptionStatut={subscription?.statut ?? null}
      hasStripeCustomer={Boolean(subscription?.stripe_customer_id)}
      organizationLangue={organization?.langue ?? null}
      organizationAdresse={organization?.adresse ?? null}
      organizationPays={organization?.pays ?? null}
      organizationEspecialidad={organization?.especialidad ?? null}
      nombreCompleto={profile?.nombre_completo ?? null}
      especialidadTexto={profile?.especialidad ?? null}
      numeroColegiatura={profile?.numero_colegiatura ?? null}
      fotoUrl={profile?.foto_url ?? null}
      codigoSeguridadUpdatedAt={profile?.codigo_seguridad_updated_at ?? null}
      mpTokenConfigured={mpTokenConfigured}
      mpTokenLast4={mpTokenLast4}
      actos={actos}
      updateProfileAction={updateProfile}
      updateFacturacionAction={updateFacturacion}
      updateIntegracionesAction={updateIntegraciones}
      updateCanalesAction={updateCanales}
      updatePlantillasAction={updatePlantillas}
      openBillingPortalAction={openBillingPortal}
      updateCategoriasNotasAction={updateCategoriasNotas}
      updateCategoriasConFotoAction={updateCategoriasConFoto}
      updateMpAccessTokenAction={updateMpAccessToken}
      updateActoPreciosAction={updateActoPrecios}
    />
  )
}

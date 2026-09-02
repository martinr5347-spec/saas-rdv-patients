import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUnipileConnectedAt } from '@/lib/dispatcher/warming'
import { getStripe } from '@/lib/payments/stripe'
import Card from '@/components/ui/Card'
import {
  NotificationType,
  VariantId,
  VARIANT_IDS,
  VARIANT_LABELS,
  NOTIFICATION_TYPE_LABELS,
  getVariantContent,
  getPreview,
} from '@/lib/dispatcher/templateVariants'

const NOTIFICATION_TYPES: NotificationType[] = ['confirmation', 'aviso', 'pago', 'anulacion', 'recordatorio']
const CANALES = ['email', 'whatsapp'] as const

async function updateSettings(formData: FormData) {
  'use server'
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!profile?.organization_id) return

  const { data: current } = await supabase
    .from('org_settings')
    .select('unipile_account_id, unipile_connected_at')
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  const unipileAccountId = String(formData.get('unipile_account_id') ?? '')
  const unipileConnectedAt = resolveUnipileConnectedAt(
    current?.unipile_account_id ?? null,
    unipileAccountId,
    current?.unipile_connected_at ?? null
  )

  const variantes: Record<NotificationType, VariantId> = {} as Record<NotificationType, VariantId>
  for (const type of NOTIFICATION_TYPES) {
    variantes[type] = formData.get(`variante_${type}`) === 'calido' ? 'calido' : 'standard'
  }

  await supabase
    .from('org_settings')
    .update({
      delai_paiement_h: Number(formData.get('delai_paiement_h')),
      delai_aviso_h: Number(formData.get('delai_aviso_h')),
      delai_rappel_h: Number(formData.get('delai_rappel_h')),
      monto_acompte: Number(formData.get('monto_acompte')),
      calendly_url: String(formData.get('calendly_url') ?? ''),
      unipile_account_id: unipileAccountId,
      unipile_connected_at: unipileConnectedAt,
      mp_access_token: String(formData.get('mp_access_token') ?? ''),
      mp_notification_url: String(formData.get('mp_notification_url') ?? ''),
      canal_email: formData.get('canal_email') === 'on',
      canal_whatsapp: formData.get('canal_whatsapp') === 'on',
      monnaie: String(formData.get('monnaie') ?? 'PEN'),
      costo_total: formData.get('costo_total') ? Number(formData.get('costo_total')) : null,
      variantes_mensaje: variantes,
    })
    .eq('organization_id', profile.organization_id)

  const langueField = formData.get('langue')
  const finalLangue = langueField === 'pt' ? 'pt' : 'es'
  const orgUpdate: { langue?: 'es' | 'pt'; adresse?: string } = {
    adresse: String(formData.get('adresse') ?? ''),
  }
  if (langueField === 'es' || langueField === 'pt') {
    orgUpdate.langue = langueField
  }
  await supabase.from('organizations').update(orgUpdate).eq('id', profile.organization_id)

  for (const type of NOTIFICATION_TYPES) {
    const variantId = variantes[type]
    for (const canal of CANALES) {
      const content = getVariantContent(type, variantId, canal, finalLangue)
      await supabase.from('message_templates').upsert(
        {
          organization_id: profile.organization_id,
          type,
          canal,
          langue: finalLangue,
          sujet: content.sujet ?? null,
          corps: content.corps,
        },
        { onConflict: 'organization_id,type,canal,langue' }
      )
    }
  }

  redirect('/dashboard/settings')
}

async function openBillingPortal() {
  'use server'
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!profile?.organization_id) return

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (!subscription?.stripe_customer_id) return

  const session = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
  })

  if (session.url) redirect(session.url)
}

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
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

  const inputClass =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400'

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Paramètres du cabinet</h1>
      {subscription?.stripe_customer_id && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Abonnement</p>
              <p className="text-sm text-gray-500">Statut : {subscription.statut}</p>
            </div>
            <form action={openBillingPortal}>
              <button type="submit" className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Gérer mon abonnement
              </button>
            </form>
          </div>
        </Card>
      )}
      <Card>
        <form action={updateSettings} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Délai paiement (h)</label>
            <input name="delai_paiement_h" type="number" defaultValue={settings?.delai_paiement_h} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Délai aviso (h)</label>
            <input name="delai_aviso_h" type="number" defaultValue={settings?.delai_aviso_h} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Délai rappel (h)</label>
            <input name="delai_rappel_h" type="number" defaultValue={settings?.delai_rappel_h} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Montant acompte</label>
            <input name="monto_acompte" type="number" step="0.01" defaultValue={settings?.monto_acompte} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Coût total consultation (optionnel)</label>
            <input name="costo_total" type="number" step="0.01" defaultValue={settings?.costo_total ?? ''} placeholder="Laisser vide si non applicable" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Devise</label>
            <select name="monnaie" defaultValue={settings?.monnaie ?? 'PEN'} className={inputClass}>
              <option value="PEN">Sol péruvien (PEN)</option>
              <option value="BRL">Real brésilien (BRL)</option>
              <option value="MXN">Peso mexicain (MXN)</option>
              <option value="COP">Peso colombien (COP)</option>
              <option value="CLP">Peso chilien (CLP)</option>
              <option value="ARS">Peso argentin (ARS)</option>
              <option value="UYU">Peso uruguayen (UYU)</option>
              <option value="USD">Dollar (USD)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Langue des messages patients</label>
          <select name="langue" defaultValue={organization?.langue ?? 'es'} className={inputClass}>
            <option value="es">Español</option>
            <option value="pt">Português</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Adresse du cabinet</label>
          <input name="adresse" defaultValue={organization?.adresse ?? ''} placeholder="Av. Brasil 2730, Pueblo Libre, Lima" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">URL Calendly</label>
          <input name="calendly_url" type="url" defaultValue={settings?.calendly_url ?? ''} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ID compte Unipile</label>
          <input name="unipile_account_id" defaultValue={settings?.unipile_account_id ?? ''} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Token MercadoPago</label>
          <input name="mp_access_token" defaultValue={settings?.mp_access_token ?? ''} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">URL webhook MercadoPago</label>
          <input name="mp_notification_url" defaultValue={settings?.mp_notification_url ?? ''} className={inputClass} />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input name="canal_email" type="checkbox" defaultChecked={settings?.canal_email} className="accent-brand-600" />
            <span className="text-sm text-gray-700">Email actif</span>
          </label>
          <label className="flex items-center gap-2">
            <input name="canal_whatsapp" type="checkbox" defaultChecked={settings?.canal_whatsapp} className="accent-brand-600" />
            <span className="text-sm text-gray-700">WhatsApp actif</span>
          </label>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Modelo de mensajes</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Elige el estilo de cada mensaje enviado a tus pacientes. Los datos de la cita (nombre, fecha, enlace de pago...) siguen siendo automáticos.
            </p>
          </div>
          {NOTIFICATION_TYPES.map((type) => {
            const currentVariant =
              (settings?.variantes_mensaje as Record<string, string> | null)?.[type] === 'calido' ? 'calido' : 'standard'
            const previewLangue = organization?.langue === 'pt' ? 'pt' : 'es'
            return (
              <fieldset key={type}>
                <legend className="block text-sm font-medium text-gray-700 mb-2">{NOTIFICATION_TYPE_LABELS[type]}</legend>
                <div className="grid grid-cols-2 gap-3">
                  {VARIANT_IDS.map((variantId) => (
                    <label
                      key={variantId}
                      className="block rounded-lg border border-gray-200 p-3 text-sm cursor-pointer hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
                    >
                      <span className="flex items-center gap-2 font-medium text-gray-800">
                        <input
                          type="radio"
                          name={`variante_${type}`}
                          value={variantId}
                          defaultChecked={currentVariant === variantId}
                          className="accent-brand-600"
                        />
                        {VARIANT_LABELS[variantId]}
                      </span>
                      <p className="mt-2 text-xs text-gray-500 whitespace-pre-line">
                        {getPreview(type, variantId, previewLangue)}
                      </p>
                    </label>
                  ))}
                </div>
              </fieldset>
            )
          })}
        </div>

          <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Enregistrer
          </button>
        </form>
      </Card>
    </div>
  )
}

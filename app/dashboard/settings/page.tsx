import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  await supabase
    .from('org_settings')
    .update({
      delai_paiement_h: Number(formData.get('delai_paiement_h')),
      delai_aviso_h: Number(formData.get('delai_aviso_h')),
      delai_rappel_h: Number(formData.get('delai_rappel_h')),
      monto_acompte: Number(formData.get('monto_acompte')),
      calendly_url: String(formData.get('calendly_url') ?? ''),
      unipile_account_id: String(formData.get('unipile_account_id') ?? ''),
      mp_access_token: String(formData.get('mp_access_token') ?? ''),
      mp_notification_url: String(formData.get('mp_notification_url') ?? ''),
      canal_email: formData.get('canal_email') === 'on',
      canal_whatsapp: formData.get('canal_whatsapp') === 'on',
    })
    .eq('organization_id', profile.organization_id)

  redirect('/dashboard/settings')
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

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Paramètres du cabinet</h1>
      <form action={updateSettings} className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Délai paiement (h)</label>
            <input name="delai_paiement_h" type="number" defaultValue={settings?.delai_paiement_h} className="mt-1 w-full rounded-md border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Délai aviso (h)</label>
            <input name="delai_aviso_h" type="number" defaultValue={settings?.delai_aviso_h} className="mt-1 w-full rounded-md border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Délai rappel (h)</label>
            <input name="delai_rappel_h" type="number" defaultValue={settings?.delai_rappel_h} className="mt-1 w-full rounded-md border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Montant acompte</label>
            <input name="monto_acompte" type="number" step="0.01" defaultValue={settings?.monto_acompte} className="mt-1 w-full rounded-md border px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">URL Calendly</label>
          <input name="calendly_url" type="url" defaultValue={settings?.calendly_url ?? ''} className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">ID compte Unipile</label>
          <input name="unipile_account_id" defaultValue={settings?.unipile_account_id ?? ''} className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Token MercadoPago</label>
          <input name="mp_access_token" defaultValue={settings?.mp_access_token ?? ''} className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">URL webhook MercadoPago</label>
          <input name="mp_notification_url" defaultValue={settings?.mp_notification_url ?? ''} className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input name="canal_email" type="checkbox" defaultChecked={settings?.canal_email} />
            <span className="text-sm">Email actif</span>
          </label>
          <label className="flex items-center gap-2">
            <input name="canal_whatsapp" type="checkbox" defaultChecked={settings?.canal_whatsapp} />
            <span className="text-sm">WhatsApp actif</span>
          </label>
        </div>
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Enregistrer
        </button>
      </form>
    </div>
  )
}

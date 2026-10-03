'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveUnipileConnectedAt } from '@/lib/dispatcher/warming'
import { getStripe } from '@/lib/payments/stripe'
import {
  NotificationType,
  VariantId,
  getVariantContent,
} from '@/lib/dispatcher/templateVariants'

const NOTIFICATION_TYPES: NotificationType[] = ['confirmation', 'aviso', 'pago', 'anulacion', 'recordatorio']
const CANALES = ['email', 'whatsapp'] as const

export async function updateSettings(formData: FormData) {
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

  if (user?.id) {
    const nombreCompleto = String(formData.get('nombre_completo') ?? '').trim() || null
    const especialidadTexto = String(formData.get('especialidad_texto') ?? '').trim() || null
    const fotoFile = formData.get('foto')

    const userUpdate: { nombre_completo: string | null; especialidad: string | null; foto_url?: string } = {
      nombre_completo: nombreCompleto,
      especialidad: especialidadTexto,
    }

    if (fotoFile instanceof File && fotoFile.size > 0 && fotoFile.type.startsWith('image/')) {
      const ext = fotoFile.name.split('.').pop() || 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, fotoFile, { upsert: true, contentType: fotoFile.type })

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
        userUpdate.foto_url = `${publicUrlData.publicUrl}?v=${Date.now()}`
      } else {
        console.error('Erreur upload avatar:', uploadError)
      }
    }

    const { error: userUpdateError } = await supabase.from('users').update(userUpdate).eq('id', user.id)
    if (userUpdateError) {
      console.error('Erreur mise a jour profil utilisateur:', userUpdateError)
    }
  }

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

  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard/settings?saved=${Date.now()}`)
}

export async function openBillingPortal() {
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

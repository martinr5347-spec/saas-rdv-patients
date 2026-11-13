'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/payments/stripe'
import { validateMercadoPagoToken } from '@/lib/payments/mercadopago'
import { encryptSecret } from '@/lib/crypto/settingsEncryption'
import {
  NotificationType,
  VariantId,
  getVariantContent,
  getControlRecallVariantContent,
} from '@/lib/dispatcher/templateVariants'
import { seedActosIfEmpty, type Especialidad } from '@/lib/patients/actosCatalog'
import { PAISES_LATAM, idiomaParaPais } from '@/lib/constants/paisesLatam'

const NOTIFICATION_TYPES: NotificationType[] = ['confirmation', 'aviso', 'pago', 'anulacion', 'recordatorio', 'reprogramacion']
const CANALES = ['email', 'whatsapp'] as const

// Le gros formulaire unique d'origine (updateSettings) a ete decoupe en 5 actions independantes,
// une par carte de SettingsView.tsx -- chaque carte a maintenant son propre <form>/bouton Guardar
// juste en dessous de ses champs, pour qu'une modification dans une carte ne se perde plus si le
// praticien ne scrolle jamais jusqu'au bouton du bas (bug reel rapporte par Martin : changement
// d'especialidad perdu car jamais clique sur le Guardar global, ~350 lignes plus bas). Aucune des
// validations/clamps/logique metier n'a change -- seul le decoupage "qui declenche quoi" a bouge.

// Carte "Mi perfil" : nom, photo, especialidad texte, pais, area de specialisation (qui declenche
// le reseed du catalogue d'actes -- comportement inchange, seulement deplace ici).
export async function updateProfile(formData: FormData) {
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
    // Optionnel, jamais obligatoire (cf. prompt prescripciones) -- ne doit jamais bloquer la
    // sauvegarde du profil, juste manquer a l'affichage du PDF de prescription si non renseigne.
    const numeroColegiatura = String(formData.get('numero_colegiatura') ?? '').trim() || null
    const fotoFile = formData.get('foto')

    const userUpdate: { nombre_completo: string | null; especialidad: string | null; numero_colegiatura: string | null; foto_url?: string } = {
      nombre_completo: nombreCompleto,
      especialidad: especialidadTexto,
      numero_colegiatura: numeroColegiatura,
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

  const { data: organization } = await supabase
    .from('organizations')
    .select('especialidad')
    .eq('id', profile.organization_id)
    .maybeSingle()

  const especialidadInput = String(formData.get('organizacion_especialidad') ?? '')
  const nuevaEspecialidad: Especialidad | null =
    especialidadInput === 'estetica_dermato' || especialidadInput === 'clinica_medica' ? especialidadInput : null

  // Corrige le pays d'une organisation deja creee (ex. par erreur sur le defaut SQL 'PE') --
  // ne touche jamais monnaie ici, meme si le pays change : le mapping pays->monnaie automatique
  // ne joue qu'a l'inscription, jamais en ecrasement a posteriori (le praticien a pu la changer
  // volontairement pour une autre raison).
  const paisInput = String(formData.get('organizacion_pais') ?? '')
  const nuevoPais = PAISES_LATAM.some((p) => p.pais === paisInput) ? paisInput : 'PE'
  // A la difference de la monnaie ci-dessus, la langue n'est jamais un choix independant
  // plausible -- elle doit toujours suivre le pays, meme a posteriori (cf. prompt
  // langue-verrouillee-sur-pais).
  const nouvelleLangue = idiomaParaPais(nuevoPais)

  await supabase
    .from('organizations')
    .update({ especialidad: nuevaEspecialidad, pays: nuevoPais, langue: nouvelleLangue })
    .eq('id', profile.organization_id)

  await supabase.from('users').update({ idioma: nouvelleLangue }).eq('organization_id', profile.organization_id).eq('role', 'praticien')

  // Reseed la liste d'actes uniquement si l'especialidad a reellement change -- seedActosIfEmpty
  // ne fait de toute facon rien si la liste de l'organisation n'est plus vide (jamais d'ecrasement
  // d'une liste deja personnalisee par le praticien), mais on evite l'appel inutile sinon.
  if (nuevaEspecialidad && nuevaEspecialidad !== organization?.especialidad) {
    try {
      await seedActosIfEmpty(supabase, profile.organization_id, nuevaEspecialidad)
    } catch (e) {
      console.error('Erreur seed actos apres changement especialidad:', e)
    }
  }

  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard/settings?saved=${Date.now()}`)
}

// Carte "Facturación y plazos" : delais de paiement/aviso/recordatorio, adelanto, costo, moneda.
export async function updateFacturacion(formData: FormData) {
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
      monnaie: String(formData.get('monnaie') ?? 'PEN'),
      costo_total: formData.get('costo_total') ? Number(formData.get('costo_total')) : null,
    })
    .eq('organization_id', profile.organization_id)

  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard/settings?saved=${Date.now()}`)
}

// Carte "Integraciones" : direccion, Calendly, webhook MercadoPago + section "Solicitud
// de reseña en Google" (lien/delai/toggle) -- cette derniere n'a pas d'action serveur dediee
// propre (contrairement a updateMpAccessToken/updateTwilioSettings), elle reste donc ici.
export async function updateIntegraciones(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!profile?.organization_id) return
  const canManagePayments = profile.role === 'praticien' || profile.role === 'admin'

  const { data: current } = await supabase
    .from('org_settings')
    .select('mp_notification_url')
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  // mp_notification_url touche a l'integration de paiement -- seuls praticien/admin peuvent la
  // modifier (pas seulement l'appartenance a l'organisation). mp_access_token lui-meme n'est plus
  // gere ici du tout : voir updateMpAccessToken ci-dessous (validation live + chiffrement +
  // confirmation visuelle, impossibles a faire proprement dans ce formulaire generique).
  const mpNotificationUrl = canManagePayments
    ? String(formData.get('mp_notification_url') ?? '')
    : current?.mp_notification_url ?? ''

  const googleReviewLink = String(formData.get('google_review_link') ?? '').trim() || null
  const resenaDelayRaw = Number(formData.get('solicitud_resena_delay_dias'))
  const solicitudResenaDelayDias = Number.isFinite(resenaDelayRaw) ? Math.min(30, Math.max(1, Math.round(resenaDelayRaw))) : 3
  // Double garde (cf. prompt "Ce qu'il NE FAUT PAS faire") : jamais active sans lien reellement
  // renseigne, meme si la case a ete cochee cote client avant que le champ lien ne soit vide.
  const solicitudResenaActiva = googleReviewLink !== null && formData.get('solicitud_resena_activa') === 'on'

  await supabase
    .from('org_settings')
    .update({
      calendly_url: String(formData.get('calendly_url') ?? ''),
      mp_notification_url: mpNotificationUrl,
      google_review_link: googleReviewLink,
      solicitud_resena_activa: solicitudResenaActiva,
      solicitud_resena_delay_dias: solicitudResenaDelayDias,
    })
    .eq('organization_id', profile.organization_id)

  await supabase
    .from('organizations')
    .update({ adresse: String(formData.get('adresse') ?? '') })
    .eq('id', profile.organization_id)

  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard/settings?saved=${Date.now()}`)
}

// Carte "Canales" : email/whatsapp actifs.
export async function updateCanales(formData: FormData) {
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
      canal_email: formData.get('canal_email') === 'on',
      canal_whatsapp: formData.get('canal_whatsapp') === 'on',
    })
    .eq('organization_id', profile.organization_id)

  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard/settings?saved=${Date.now()}`)
}

// Carte "Plantillas de mensaje" : variantes standard/calido des 6 types generiques + control_recall,
// anticipacion du rappel de controle.
export async function updatePlantillas(formData: FormData) {
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

  const variantes: Record<NotificationType, VariantId> = {} as Record<NotificationType, VariantId>
  for (const type of NOTIFICATION_TYPES) {
    variantes[type] = formData.get(`variante_${type}`) === 'calido' ? 'calido' : 'standard'
  }
  const varianteControlRecall: VariantId = formData.get('variante_control_recall') === 'calido' ? 'calido' : 'standard'
  const anticipacionDiasRaw = Number(formData.get('control_recall_anticipacion_dias'))
  const anticipacionDias = Number.isFinite(anticipacionDiasRaw) ? Math.min(90, Math.max(0, Math.round(anticipacionDiasRaw))) : 14

  await supabase
    .from('org_settings')
    .update({
      variantes_mensaje: variantes,
      variante_control_recall: varianteControlRecall,
      control_recall_anticipacion_dias: anticipacionDias,
    })
    .eq('organization_id', profile.organization_id)

  const { data: organization } = await supabase
    .from('organizations')
    .select('langue')
    .eq('id', profile.organization_id)
    .maybeSingle()
  const finalLangue = organization?.langue === 'pt' ? 'pt' : 'es'

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

  // "control_recall" respecte desormais aussi canal_email/canal_whatsapp (lib/cron/patient-recall.ts) --
  // meme boucle CANALES que les 6 types ci-dessus.
  for (const canal of CANALES) {
    const controlRecallContent = getControlRecallVariantContent(varianteControlRecall, canal, finalLangue)
    await supabase.from('message_templates').upsert(
      {
        organization_id: profile.organization_id,
        type: 'control_recall',
        canal,
        langue: finalLangue,
        sujet: controlRecallContent.sujet ?? null,
        corps: controlRecallContent.corps,
      },
      { onConflict: 'organization_id,type,canal,langue' }
    )
  }

  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard/settings?saved=${Date.now()}`)
}

// Chemin de sauvegarde dedie au token MercadoPago -- separe du formulaire generique ci-dessus
// car il a besoin de 3 choses qu'un simple champ de formData ne permet pas : validation live
// contre l'API MercadoPago avant stockage, chiffrement, et une confirmation visuelle
// ("Conectado como X") renvoyee au client apres sauvegarde.
export async function updateMpAccessToken(token: string): Promise<{ ok: boolean; error?: string; nickname?: string; email?: string; last4?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!profile?.organization_id) return { ok: false, error: 'No autorizado' }
  if (profile.role !== 'praticien' && profile.role !== 'admin') {
    return { ok: false, error: 'No tienes permiso para modificar la integración de pagos' }
  }

  const trimmed = token.trim()
  if (!trimmed) return { ok: false, error: 'Ingresa un token' }

  const validation = await validateMercadoPagoToken(trimmed)
  if (!validation.valid) {
    return { ok: false, error: 'Token MercadoPago inválido o expirado' }
  }

  const { error } = await supabase
    .from('org_settings')
    .update({ mp_access_token: encryptSecret(trimmed) })
    .eq('organization_id', profile.organization_id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/settings')
  return {
    ok: true,
    nickname: validation.nickname ?? undefined,
    email: validation.email ?? undefined,
    last4: trimmed.slice(-4),
  }
}

// Le compte Twilio (subaccount SID, numero WhatsApp, token) est gere et paye entierement par
// Martin, jamais par le praticien -- cf. TwilioSettingsFields retire de SettingsView.tsx. Cette
// action reste exportee (donc joignable en appel direct hors UI, ex. requete reseau directe vers
// la server action) mais ne doit plus jamais avoir d'effet : elle renvoie toujours une erreur sans
// lire ni ecrire org_settings. Martin continue d'editer ces 3 champs directement en base.
export async function updateTwilioSettings(): Promise<{ ok: boolean; error?: string; last4?: string }> {
  return { ok: false, error: 'No autorizado' }
}

export async function updateCategoriasNotas(categorias: string[]) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!profile?.organization_id) return { ok: false, error: 'No autorizado' }

  const cleaned = Array.from(new Set(categorias.map((c) => c.trim()).filter(Boolean)))
    .slice(0, 10)
    .map((c) => c.slice(0, 24))

  const { error } = await supabase
    .from('org_settings')
    .update({ categorias_notas: cleaned })
    .eq('organization_id', profile.organization_id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/settings')
  return { ok: true, categorias: cleaned }
}

export async function updateCategoriasConFoto(categorias: string[]) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!profile?.organization_id) return { ok: false, error: 'No autorizado' }

  const cleaned = Array.from(new Set(categorias.map((c) => c.trim()).filter(Boolean))).slice(0, 10)

  const { error } = await supabase
    .from('org_settings')
    .update({ categorias_con_foto: cleaned })
    .eq('organization_id', profile.organization_id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/settings')
  return { ok: true, categorias: cleaned }
}

// Tarifs par defaut du catalogue d'actes (Configuracion) -- pre-remplissent (sans contraindre) le
// montant a la selection d'un acte en fiche patient, voir ActosRealizadosCard. N'ajoute jamais de
// nouvel acte : seul le flux "nuevo acto" en fiche patient cree des entrees dans `actos`.
export async function updateActoPrecios(
  precios: { id: string; precio: number | null }[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!profile?.organization_id) return { ok: false, error: 'No autorizado' }
  const organizationId = profile.organization_id

  for (const { precio } of precios) {
    if (precio !== null && (!Number.isFinite(precio) || precio < 0)) {
      return { ok: false, error: 'Precio inválido' }
    }
  }
  if (precios.length === 0) return { ok: true }

  // Un update par acte (scope par .eq('organization_id', ...) -- empeche qu'un id manipule cote
  // client touche l'acte d'une autre organisation), mais tous lances en parallele plutot
  // qu'en sequence : un catalogue d'une dizaine d'actes rendait la sauvegarde perceptiblement
  // lente (~2.5s) en attendant chaque aller-retour l'un apres l'autre.
  const resultats = await Promise.all(
    precios.map(({ id, precio }) =>
      supabase.from('actos').update({ precio_default: precio }).eq('id', id).eq('organization_id', organizationId)
    )
  )
  const echec = resultats.find((r) => r.error)
  if (echec?.error) return { ok: false, error: echec.error.message }

  // Pas de revalidatePath sur /dashboard/patients : ActosRealizadosCard (PatientDetailView.tsx)
  // charge toujours son catalogue via un fetch() client frais a chaque montage, jamais via le
  // cache de donnees Next -- un revalidatePath ici serait sans effet, juste un appel en plus.
  revalidatePath('/dashboard/settings')
  return { ok: true }
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

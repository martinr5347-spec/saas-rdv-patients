'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

async function getOrganizationId(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  return profile?.organization_id ?? null
}

export async function updateDisponibilidad(
  horarios: { diaSemana: number; horaInicio: string; horaFin: string }[],
  parametros: { duracionCitaMin: number; bufferMin: number; anticipacionMinHoras: number; anticipacionMaxDias: number }
) {
  const supabase = createClient()
  const organizationId = await getOrganizationId(supabase)
  if (!organizationId) return { ok: false, error: 'No autorizado' }

  // Validation serveur -- ne pas faire confiance aux valeurs du client
  if (
    !Number.isInteger(parametros.duracionCitaMin) || parametros.duracionCitaMin < 5 || parametros.duracionCitaMin > 480 ||
    !Number.isInteger(parametros.bufferMin) || parametros.bufferMin < 0 || parametros.bufferMin > 120 ||
    !Number.isInteger(parametros.anticipacionMinHoras) || parametros.anticipacionMinHoras < 0 || parametros.anticipacionMinHoras > 720 ||
    !Number.isInteger(parametros.anticipacionMaxDias) || parametros.anticipacionMaxDias < 1 || parametros.anticipacionMaxDias > 365
  ) {
    return { ok: false, error: 'Parámetros inválidos' }
  }

  const horariosValidos = horarios.filter(
    (h) => h.diaSemana >= 0 && h.diaSemana <= 6 && /^\d{2}:\d{2}$/.test(h.horaInicio) && /^\d{2}:\d{2}$/.test(h.horaFin) && h.horaFin > h.horaInicio
  )

  await supabase
    .from('org_settings')
    .update({
      duracion_cita_min: parametros.duracionCitaMin,
      buffer_min: parametros.bufferMin,
      anticipacion_min_horas: parametros.anticipacionMinHoras,
      anticipacion_max_dias: parametros.anticipacionMaxDias,
    })
    .eq('organization_id', organizationId)

  // Remplacement complet des horaires (simple à raisonner, volume minuscule -- 7 lignes max par organisation)
  await supabase.from('org_availability').delete().eq('organization_id', organizationId)
  if (horariosValidos.length > 0) {
    await supabase.from('org_availability').insert(
      horariosValidos.map((h) => ({
        organization_id: organizationId,
        dia_semana: h.diaSemana,
        hora_inicio: h.horaInicio,
        hora_fin: h.horaFin,
      }))
    )
  }

  revalidatePath('/dashboard/disponibilidad')
  return { ok: true }
}

export async function updateSlug(slugPropuesto: string) {
  const supabase = createClient()
  const organizationId = await getOrganizationId(supabase)
  if (!organizationId) return { ok: false, error: 'No autorizado' }

  const slug = slugify(slugPropuesto)
  if (slug.length < 3) {
    return { ok: false, error: 'El enlace debe tener al menos 3 caracteres' }
  }

  const { error } = await supabase.from('organizations').update({ slug }).eq('id', organizationId)

  if (error) {
    // Contrainte unique sur slug -- collision avec une autre organisation
    if (error.code === '23505') {
      return { ok: false, error: 'Este enlace ya está en uso, elige otro' }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/disponibilidad')
  return { ok: true, slug }
}

export async function addBlockedDate(fecha: string, motivo: string | null) {
  const supabase = createClient()
  const organizationId = await getOrganizationId(supabase)
  if (!organizationId) return { ok: false, error: 'No autorizado' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { ok: false, error: 'Fecha inválida' }
  }

  const { data: inserted, error } = await supabase
    .from('org_blocked_dates')
    .insert({ organization_id: organizationId, fecha, motivo: motivo?.trim() || null })
    .select('id, fecha, motivo')
    .single()

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Esta fecha ya está bloqueada' }
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/disponibilidad')
  return { ok: true, blockedDate: inserted }
}

export async function removeBlockedDate(id: string) {
  const supabase = createClient()
  const organizationId = await getOrganizationId(supabase)
  if (!organizationId) return { ok: false, error: 'No autorizado' }

  const { error } = await supabase
    .from('org_blocked_dates')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId) // ceinture + bretelles, la policy RLS couvre déjà ça

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/disponibilidad')
  return { ok: true }
}

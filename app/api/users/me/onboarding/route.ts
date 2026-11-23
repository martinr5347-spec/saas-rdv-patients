import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Etat du tour d'onboarding guide (react-joyride) -- cf. prompt onboarding-tour-guide. Un seul
// PATCH accepte 1 a 3 champs optionnels (jamais de route separee par action, le pattern reste
// simple vu le volume de champs) :
// - sidebarSeen: true -> onboarding_sidebar_seen = true (tour niveau 1, une seule fois)
// - pageSeen: '<id>' -> ajoute cet id a onboarding_pages_seen s'il n'y est pas deja (tour niveau 2)
// - disabled: boolean -> onboarding_disabled (desactivation/reactivation volontaire depuis le menu
//   "?" du Header)
const VALID_PAGE_IDS = [
  'inicio',
  'pacientes',
  'citas',
  'cita_detalle',
  'ingresos',
  'analisis',
  'disponibilidad',
  'configuracion',
  'paciente_detalle',
]

export async function PATCH(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const sidebarSeen = body.sidebarSeen === true
  const pageSeen = typeof body.pageSeen === 'string' ? body.pageSeen : null
  const disabled = typeof body.disabled === 'boolean' ? body.disabled : undefined

  if (pageSeen !== null && !VALID_PAGE_IDS.includes(pageSeen)) {
    return NextResponse.json({ error: 'Página inválida' }, { status: 400 })
  }

  const patch: { onboarding_sidebar_seen?: boolean; onboarding_pages_seen?: string[]; onboarding_disabled?: boolean } = {}

  if (sidebarSeen) {
    patch.onboarding_sidebar_seen = true
  }

  if (pageSeen !== null) {
    const { data: current } = await supabase.from('users').select('onboarding_pages_seen').eq('id', user.id).maybeSingle()
    const existing = Array.isArray(current?.onboarding_pages_seen) ? (current!.onboarding_pages_seen as string[]) : []
    if (!existing.includes(pageSeen)) {
      patch.onboarding_pages_seen = [...existing, pageSeen]
    }
  }

  if (disabled !== undefined) {
    patch.onboarding_disabled = disabled
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: true })
  }

  const { error } = await supabase.from('users').update(patch).eq('id', user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

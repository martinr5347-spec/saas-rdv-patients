import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRouteMessages } from '@/lib/i18n/getRouteLocale'

export async function POST(req: Request) {
  const supabase = createClient()
  const m = getRouteMessages().dashboard.patients.nuevo
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: m.errorNoAutenticado }, { status: 401 })
  }

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle()
  if (!profile?.organization_id) {
    return NextResponse.json({ error: m.errorNoAutorizado }, { status: 403 })
  }
  const organizationId = profile.organization_id

  const body = await req.json().catch(() => ({}))
  const nombre = (body.nombre ?? '').toString().trim()
  const email = body.email ? body.email.toString().trim().toLowerCase() : null
  const telefono = body.telefono ? body.telefono.toString().trim() : null

  if (!nombre) {
    return NextResponse.json({ error: m.errorFaltaNombre }, { status: 400 })
  }
  if (!email && !telefono) {
    return NextResponse.json({ error: m.errorFaltaEmailTelefono }, { status: 400 })
  }

  // Dédoublonnage contre les patients déjà existants de l'organisation -- même règle que l'import
  // en masse (app/api/patients/import/commit/route.ts) : un email OU un téléphone déjà présent
  // suffit à considérer qu'il s'agit du même patient, pas besoin que les deux coïncident.
  const duplicado = await findDuplicatePatient(supabase, organizationId, email, telefono)
  if (duplicado) {
    return NextResponse.json({ error: m.duplicadoMensaje, duplicatePatientId: duplicado.id }, { status: 409 })
  }

  const { data: inserted, error } = await supabase
    .from('patients')
    .insert({ organization_id: organizationId, nom: nombre, email, telefono })
    .select('id')
    .single()

  if (error) {
    // Collision rare (création concurrente entre la vérification ci-dessus et l'insertion) --
    // les contraintes unique(organization_id, email)/unique(organization_id, telefono) l'auraient
    // bloquée de toute façon : on retrouve le patient concurrent plutôt que de renvoyer une 500.
    if (error.code === '23505') {
      const concurrent = await findDuplicatePatient(supabase, organizationId, email, telefono)
      if (concurrent) {
        return NextResponse.json({ error: m.duplicadoMensaje, duplicatePatientId: concurrent.id }, { status: 409 })
      }
    }
    return NextResponse.json({ error: m.errorCrear, detalle: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 })
}

async function findDuplicatePatient(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  email: string | null,
  telefono: string | null
): Promise<{ id: string } | null> {
  if (email) {
    const { data } = await supabase
      .from('patients')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .maybeSingle()
    if (data) return data
  }
  if (telefono) {
    const { data } = await supabase
      .from('patients')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('telefono', telefono)
      .maybeSingle()
    if (data) return data
  }
  return null
}

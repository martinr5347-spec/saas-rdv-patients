import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Donnee de facturation, pas clinique -- aucun PIN, systeme totalement separe des notas clinicas
// (voir app/api/patients/[id]/notes/route.ts pour ce dernier).

async function getOrganizationId(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle()
  return { organizationId: profile?.organization_id ?? null, userId: user.id }
}

// GET = catalogue d'actes actifs de l'organisation + historique des actes du patient
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const auth = await getOrganizationId(supabase)
  if (!auth?.organizationId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: patientRow } = await supabase
    .from('patients')
    .select('id')
    .eq('id', params.id)
    .eq('organization_id', auth.organizationId)
    .maybeSingle()
  if (!patientRow) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  const { data: catalogo } = await supabase
    .from('actos')
    .select('id, nombre')
    .eq('organization_id', auth.organizationId)
    .eq('activo', true)
    .order('nombre')

  const { data: historial } = await supabase
    .from('actos_realizados')
    .select('id, monto, fecha, acto_texto_libre, appointment_id, actos(nombre)')
    .eq('patient_id', params.id)
    .order('fecha', { ascending: false })

  const historialResuelto = (historial ?? []).map((h) => ({
    id: h.id,
    monto: Number(h.monto),
    fecha: h.fecha,
    appointmentId: h.appointment_id,
    nombre: (h.actos as unknown as { nombre: string } | null)?.nombre ?? h.acto_texto_libre ?? '',
  }))

  return NextResponse.json({ catalogo: catalogo ?? [], historial: historialResuelto })
}

// POST = ajoute un acte realise. 3 modes :
// - 'catalogo' : actoId existant choisi dans la liste
// - 'nuevo'    : cree une entree permanente dans actos pour cette organisation, puis l'utilise
// - 'libre'    : stocke uniquement dans acto_texto_libre, n'alimente jamais le catalogue
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const auth = await getOrganizationId(supabase)
  if (!auth?.organizationId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: patientRow } = await supabase
    .from('patients')
    .select('id')
    .eq('id', params.id)
    .eq('organization_id', auth.organizationId)
    .maybeSingle()
  if (!patientRow) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const mode = body.mode as string | undefined
  const monto = Number(body.monto)
  const fecha = body.fecha as string | undefined
  const appointmentId = typeof body.appointmentId === 'string' ? body.appointmentId : null

  if (!['catalogo', 'nuevo', 'libre'].includes(mode ?? '')) {
    return NextResponse.json({ error: 'Modo inválido' }, { status: 400 })
  }
  if (!Number.isFinite(monto) || monto < 0) {
    return NextResponse.json({ error: 'Ingresa un monto válido' }, { status: 400 })
  }
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  }

  let actoId: string | null = null
  let actoTextoLibre: string | null = null
  let nombreParaRespuesta = ''

  if (mode === 'catalogo') {
    const requestedId = body.actoId as string | undefined
    if (!requestedId) return NextResponse.json({ error: 'Selecciona un acto de la lista' }, { status: 400 })
    const { data: actoRow } = await supabase
      .from('actos')
      .select('id, nombre')
      .eq('id', requestedId)
      .eq('organization_id', auth.organizationId)
      .maybeSingle()
    if (!actoRow) return NextResponse.json({ error: 'Acto no encontrado' }, { status: 404 })
    actoId = actoRow.id
    nombreParaRespuesta = actoRow.nombre
  } else {
    const nombre = (body.nombre as string | undefined)?.trim()
    if (!nombre) return NextResponse.json({ error: 'Ingresa el nombre del acto' }, { status: 400 })

    if (mode === 'nuevo') {
      const { data: nuevoActo, error: nuevoActoError } = await supabase
        .from('actos')
        .insert({ organization_id: auth.organizationId, nombre, especialidad_origen: null })
        .select('id, nombre')
        .single()
      if (nuevoActoError || !nuevoActo) {
        return NextResponse.json({ error: nuevoActoError?.message ?? 'Error al crear el acto' }, { status: 500 })
      }
      actoId = nuevoActo.id
      nombreParaRespuesta = nuevoActo.nombre
    } else {
      // mode === 'libre'
      actoTextoLibre = nombre
      nombreParaRespuesta = nombre
    }
  }

  const { data: realizado, error: realizadoError } = await supabase
    .from('actos_realizados')
    .insert({
      organization_id: auth.organizationId,
      patient_id: params.id,
      acto_id: actoId,
      acto_texto_libre: actoTextoLibre,
      monto,
      fecha,
      appointment_id: appointmentId,
      created_by: auth.userId,
    })
    .select('id, monto, fecha, appointment_id')
    .single()

  if (realizadoError || !realizado) {
    return NextResponse.json({ error: realizadoError?.message ?? 'Error al guardar el acto' }, { status: 500 })
  }

  return NextResponse.json({
    acto: {
      id: realizado.id,
      monto: Number(realizado.monto),
      fecha: realizado.fecha,
      appointmentId: realizado.appointment_id,
      nombre: nombreParaRespuesta,
    },
    nuevoEnCatalogo: mode === 'nuevo' ? { id: actoId, nombre: nombreParaRespuesta } : null,
  })
}

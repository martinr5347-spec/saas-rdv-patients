import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

async function verifyCodigo(supabase: ReturnType<typeof createClient>, userId: string, codigo: string) {
  const { data: userRow } = await supabase
    .from('users')
    .select('codigo_seguridad_hash')
    .eq('id', userId)
    .single()

  if (!userRow?.codigo_seguridad_hash) {
    return { ok: false, reason: 'Código de seguridad no configurado. Configúralo en Configuración.' }
  }

  const match = await bcrypt.compare(codigo, userRow.codigo_seguridad_hash)
  return { ok: match, reason: match ? null : 'Código incorrecto' }
}

// POST = déverrouille ET retourne la liste des notes existantes
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const codigo = body.codigo as string | undefined
  if (!codigo) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }

  const check = await verifyCodigo(supabase, authUser.id, codigo)
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 403 })
  }

  const { data: notes, error } = await supabase
    .from('patient_notes')
    .select('id, contenido, created_at')
    .eq('patient_id', params.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notes: notes ?? [] })
}

// PUT = ajoute une nouvelle note (revérifie le code à chaque écriture)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const codigo = body.codigo as string | undefined
  const contenido = (body.contenido as string | undefined)?.trim()

  if (!codigo) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }
  if (!contenido || contenido.length === 0 || contenido.length > 500) {
    return NextResponse.json({ error: 'Nota inválida (máx. 500 caracteres)' }, { status: 400 })
  }

  const check = await verifyCodigo(supabase, authUser.id, codigo)
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 403 })
  }

  // organization_id récupéré depuis le patient, jamais depuis le body
  const { data: patientRow } = await supabase
    .from('patients')
    .select('organization_id')
    .eq('id', params.id)
    .single()

  if (!patientRow) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  const { data: newNote, error } = await supabase
    .from('patient_notes')
    .insert({
      patient_id: params.id,
      organization_id: patientRow.organization_id,
      contenido,
    })
    .select('id, contenido, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ note: newNote })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

const MAX_ROWS = 500
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 Mo

const FIELD_SYNONYMS: Record<'nombre' | 'email' | 'telefono' | 'fecha_nacimiento', string[]> = {
  nombre: ['nombre', 'nome', 'name', 'nombre completo', 'paciente', 'cliente'],
  email: ['email', 'correo', 'mail', 'e-mail', 'correo electronico'],
  telefono: ['telefono', 'tel', 'phone', 'celular', 'whatsapp', 'movil'],
  fecha_nacimiento: ['fecha de nacimiento', 'nacimiento', 'birthdate', 'fecha nacimiento', 'dob'],
}

function normalizeHeader(h: string) {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .trim()
}

function guessField(header: string): string | null {
  const normalized = normalizeHeader(header)
  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    if (synonyms.some((s) => normalized.includes(s))) return field
  }
  return null
}

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'El archivo supera los 5 MB' }, { status: 400 })
  }

  const allowedExt = ['.xlsx', '.xls', '.csv']
  if (!allowedExt.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return NextResponse.json({ error: 'Formato no soportado (solo .xlsx, .xls, .csv)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let rows: Record<string, unknown>[]
  try {
    // raw: true -- sans ça, le parseur CSV ("plaintext") de SheetJS déduit le type de chaque
    // cellule et convertit les numéros de téléphone en nombre JS, perdant le préfixe "+" (ex.
    // "+51987654321" devient 51987654321). Toutes les valeurs restent ainsi du texte brut.
    const workbook = XLSX.read(buffer, { type: 'buffer', raw: true })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false })
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo -- ¿está dañado o en un formato no soportado?' }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'El archivo no contiene filas' }, { status: 400 })
  }

  const totalRows = rows.length
  const truncated = totalRows > MAX_ROWS
  rows = rows.slice(0, MAX_ROWS)

  const headers = Object.keys(rows[0])
  const suggestedMapping: Record<string, string | null> = {}
  for (const h of headers) suggestedMapping[h] = guessField(h)

  return NextResponse.json({
    headers,
    suggestedMapping,
    rows, // lignes brutes (max 500), le client applique le mapping choisi avant l'étape de confirmation
    totalRows,
    truncated, // true si le fichier avait plus de 500 lignes -- à afficher clairement à l'utilisateur
  })
}

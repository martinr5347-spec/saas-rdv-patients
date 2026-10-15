import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ImportRow {
  nombre: string
  email: string | null
  telefono: string | null
}

const MAX_ROWS = 500

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle()
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const organizationId = profile.organization_id

  const body = await req.json().catch(() => ({}))
  const inputRows = body.rows as ImportRow[] | undefined
  if (!Array.isArray(inputRows) || inputRows.length === 0) {
    return NextResponse.json({ error: 'Ninguna fila para importar' }, { status: 400 })
  }
  if (inputRows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Máximo ${MAX_ROWS} filas por importación` }, { status: 400 })
  }

  // Normalisation + validation (nom requis, email OU telefono requis)
  const erroresValidacion: { fila: number; motivo: string }[] = []
  const candidatos: ImportRow[] = []
  inputRows.forEach((row, i) => {
    const nombre = (row.nombre ?? '').toString().trim()
    const email = row.email ? row.email.toString().trim().toLowerCase() : null
    const telefono = row.telefono ? row.telefono.toString().trim() : null

    if (!nombre) {
      erroresValidacion.push({ fila: i + 1, motivo: 'Falta el nombre' })
      return
    }
    if (!email && !telefono) {
      erroresValidacion.push({ fila: i + 1, motivo: 'Falta email y teléfono (se requiere al menos uno)' })
      return
    }
    candidatos.push({ nombre, email, telefono })
  })

  // Dédoublonnage DANS le fichier lui-même (garde la première occurrence)
  const emailsVus = new Set<string>()
  const telefonosVus = new Set<string>()
  const omitidosEnArchivo: number[] = []
  const unicos: ImportRow[] = []
  candidatos.forEach((row, i) => {
    const dupEmail = row.email && emailsVus.has(row.email)
    const dupTelefono = row.telefono && telefonosVus.has(row.telefono)
    if (dupEmail || dupTelefono) {
      omitidosEnArchivo.push(i)
      return
    }
    if (row.email) emailsVus.add(row.email)
    if (row.telefono) telefonosVus.add(row.telefono)
    unicos.push(row)
  })

  // Dédoublonnage contre les patients déjà existants de l'organisation.
  // telefono et email ont CHACUN leur propre contrainte unique (pas composite) -- on vérifie
  // donc les deux indépendamment, pas seulement une paire email+telefono identique.
  //
  // Comparaison faite en mémoire (patients de l'org récupérés une fois) plutôt qu'avec un filtre
  // PostgREST .or()/.in.() construit par interpolation de chaîne : des valeurs de fichier contenant
  // des caractères spéciaux (parenthèses, virgules dans un téléphone mal formaté) casseraient la
  // syntaxe du filtre -- un cabinet individuel a un nombre de patients qui reste trivial à charger
  // en une fois, pas besoin d'une requête filtrée côté serveur ici.
  let aInserer = unicos
  if (unicos.length > 0) {
    const { data: existants } = await supabase
      .from('patients')
      .select('email, telefono')
      .eq('organization_id', organizationId)

    const emailsExistants = new Set((existants ?? []).map((p) => p.email).filter(Boolean))
    const telefonosExistants = new Set((existants ?? []).map((p) => p.telefono).filter(Boolean))

    aInserer = unicos.filter((r) => {
      const yaExisteEmail = r.email && emailsExistants.has(r.email)
      const yaExisteTelefono = r.telefono && telefonosExistants.has(r.telefono)
      return !yaExisteEmail && !yaExisteTelefono
    })
  }
  const omitidosExistentes = unicos.length - aInserer.length

  let importados = 0
  if (aInserer.length > 0) {
    const { data: inserted, error } = await supabase
      .from('patients')
      .insert(
        aInserer.map((r) => ({
          organization_id: organizationId,
          nom: r.nombre,
          email: r.email,
          telefono: r.telefono,
        }))
      )
      .select('id')

    if (error) {
      // Dédoublonnage déjà fait ci-dessus -- une erreur ici est probablement une collision rare
      // (import concurrent). On ne fait pas échouer tout le lot : le rapport le signale, et comme
      // le dédoublonnage revérifie la base à chaque tentative, relancer le même fichier est sans risque.
      return NextResponse.json(
        {
          error: 'Error al insertar algunos pacientes -- puedes volver a intentar el mismo archivo, los ya importados se omitirán automáticamente.',
          detalle: error.message,
        },
        { status: 500 }
      )
    }
    importados = inserted?.length ?? 0
  }

  return NextResponse.json({
    importados,
    omitidosDuplicadosEnArchivo: omitidosEnArchivo.length,
    omitidosYaExistentes: omitidosExistentes,
    errores: erroresValidacion,
  })
}

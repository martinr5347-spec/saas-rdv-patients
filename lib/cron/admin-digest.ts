import { createServiceRoleClient } from '@/lib/supabase/admin'
import { alertAdminEmail } from '@/lib/dispatcher'

// Duplique volontairement daysSince() de app/admin/page.tsx -- ce prompt ne touche jamais a ce
// fichier (le panneau manuel reste tel quel), cf. prompt "alertes admin proactives".
function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function sendAdminDigest() {
  const supabase = createServiceRoleClient()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Meme requete que app/admin/page.tsx (envios fallidos), fenetre 24h au lieu de 30 jours.
  const { data: failedNotifs } = await supabase
    .from('notifications')
    .select('id, canal, type, error_message, created_at, appointments(organization_id, patients(nom))')
    .eq('statut', 'failed')
    .gte('created_at', since24h)
    .order('created_at', { ascending: false })

  const { data: organizations } = await supabase.from('organizations').select('id, nom')
  const orgNameById = new Map((organizations ?? []).map((o) => [o.id, o.nom]))

  // Meme calcul de derniere activite que app/admin/page.tsx (max fecha_reserva par organisation),
  // mais sur tout l'historique (pas une fenetre) -- "inactif" se mesure depuis la derniere activite
  // reelle, pas depuis les dernieres 24h.
  const { data: appointmentsAll } = await supabase.from('appointments').select('organization_id, fecha_reserva')
  const lastActivityByOrg = new Map<string, string>()
  for (const appt of appointmentsAll ?? []) {
    const current = lastActivityByOrg.get(appt.organization_id)
    if (!current || new Date(appt.fecha_reserva) > new Date(current)) {
      lastActivityByOrg.set(appt.organization_id, appt.fecha_reserva)
    }
  }
  const inactiveOrgs = (organizations ?? [])
    .map((org) => ({ nom: org.nom, lastActivity: lastActivityByOrg.get(org.id) ?? null }))
    .filter((org): org is { nom: string; lastActivity: string } => Boolean(org.lastActivity) && daysSince(org.lastActivity as string) > 14)

  const { count: newPatientsCount } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since24h)

  // fecha_reserva = date de creation de la reservation (default now() a l'insert, jamais mise a
  // jour ensuite) -- meme champ que l'activite ci-dessus, pas de colonne distincte "created_at".
  const { count: newAppointmentsCount } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .gte('fecha_reserva', since24h)

  const hasFailures = (failedNotifs ?? []).length > 0
  const hasInactive = inactiveOrgs.length > 0
  const hasActivity = (newPatientsCount ?? 0) > 0 || (newAppointmentsCount ?? 0) > 0

  let html: string
  if (!hasFailures && !hasInactive && !hasActivity) {
    // Distinct d'une absence d'email : Martin doit pouvoir voir que le cron tourne bien meme
    // quand il n'y a rien a signaler.
    html = '<p>Rien à signaler aujourd\'hui.</p>'
  } else {
    const failuresHtml = hasFailures
      ? `<h2>Envíos fallidos (24h)</h2><table border="1" cellpadding="6"><tr><th>Cabinet</th><th>Paciente</th><th>Canal</th><th>Tipo</th><th>Error</th></tr>${(
          failedNotifs ?? []
        )
          .map((n) => {
            const appt = n.appointments as unknown as { organization_id: string; patients: { nom: string } | null } | null
            const orgNom = appt ? orgNameById.get(appt.organization_id) ?? '-' : '-'
            return `<tr><td>${escapeHtml(orgNom)}</td><td>${escapeHtml(appt?.patients?.nom ?? '-')}</td><td>${escapeHtml(n.canal)}</td><td>${escapeHtml(n.type)}</td><td>${escapeHtml(n.error_message ?? '-')}</td></tr>`
          })
          .join('')}</table>`
      : '<p>Sin envíos fallidos en las últimas 24h.</p>'

    const inactiveHtml = hasInactive
      ? `<h2>Cabinets inactivos (+14 días)</h2><ul>${inactiveOrgs
          .map((o) => `<li>${escapeHtml(o.nom)} — hace ${daysSince(o.lastActivity)} días</li>`)
          .join('')}</ul>`
      : '<p>Ningún cabinet inactivo.</p>'

    const activityHtml = `<h2>Actividad (24h)</h2><p>Nuevos pacientes: ${newPatientsCount ?? 0}<br>Nuevas citas: ${newAppointmentsCount ?? 0}</p>`

    html = `${failuresHtml}${inactiveHtml}${activityHtml}`
  }

  await alertAdminEmail('Resumen diario Núcleo', html)
}

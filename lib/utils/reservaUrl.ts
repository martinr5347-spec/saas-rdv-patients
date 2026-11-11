// Partage par lib/dispatcher/index.ts (anulacion) et lib/cron/patient-recall.ts (control_recall) --
// pointe vers la reservation native reservar/[slug] plutot que vers calendly_url (lien externe,
// obsolete depuis le passage a la reservation native), avec fallback sur calendly_url uniquement
// si l'organisation n'a pas encore de slug de reservation configure.
export function buildReservaUrl(slug: string | null, calendlyUrl: string | null, controlSesionId: string | null = null): string {
  if (slug) {
    const base = `${process.env.NEXT_PUBLIC_APP_URL}/reservar/${slug}`
    return controlSesionId ? `${base}?controlSesionId=${controlSesionId}` : base
  }
  return calendlyUrl ?? ''
}

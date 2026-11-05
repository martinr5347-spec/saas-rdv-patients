// Liste courte de titres a ignorer avant de prendre le premier mot du nom complet -- une
// personne, pas une enumeration exhaustive de titres existants.
const TITULOS = ['dra.', 'dr.', 'sr.', 'sra.', 'srta.']

// Extrait le prenom seul depuis le nom complet brut de patients.nom, pour la salutation des
// messages sortants uniquement (voir lib/dispatcher/index.ts et lib/cron/patient-recall.ts) --
// ne touche jamais patients.nom lui-meme, qui reste affiche tel quel dans le reste de l'UI.
export function extraerPrimerNombre(nombreCompleto: string): string {
  const palabras = nombreCompleto.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return ''

  const primera = palabras[0].toLowerCase()
  if (TITULOS.includes(primera)) {
    palabras.shift()
  }

  return palabras[0] ?? ''
}

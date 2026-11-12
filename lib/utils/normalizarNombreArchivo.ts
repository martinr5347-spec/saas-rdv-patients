// Convention de nommage demandee par Martin pour les prescriptions : {Nom_Patient}_{jj-mm-aa}.pdf
// -- accents retires, espaces remplaces par "_", caracteres non alphanumeriques retires (ex.
// "Maria Gomez" -> "Maria_Gomez"). Sert a la fois au storage_path et au nom propose au telechargement.
export function normalizarNombreArchivo(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
}

// jj-mm-aa (tirets, jamais de "/" -- invalide dans un nom de fichier) a partir d'une date
// 'yyyy-MM-dd' (format retourne par une colonne SQL `date`).
export function formatFechaArchivo(fechaIso: string): string {
  const [yyyy, mm, dd] = fechaIso.split('-')
  return `${dd}-${mm}-${yyyy.slice(-2)}`
}

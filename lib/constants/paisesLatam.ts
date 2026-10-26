// Source unique pour la liste de pays LATAM -- reutilisee par l'inscription, Configuracion et la
// page de reserva publique (indicatifs telephoniques). Ne jamais dupliquer cette liste ailleurs.
export interface PaisLatam {
  pais: string
  nombre: string
  indicativo: string
  bandera: string
}

export const PAISES_LATAM: PaisLatam[] = [
  { pais: 'PE', nombre: 'Perú', indicativo: '+51', bandera: '🇵🇪' },
  { pais: 'CL', nombre: 'Chile', indicativo: '+56', bandera: '🇨🇱' },
  { pais: 'CO', nombre: 'Colombia', indicativo: '+57', bandera: '🇨🇴' },
  { pais: 'MX', nombre: 'México', indicativo: '+52', bandera: '🇲🇽' },
  { pais: 'AR', nombre: 'Argentina', indicativo: '+54', bandera: '🇦🇷' },
  { pais: 'BR', nombre: 'Brasil', indicativo: '+55', bandera: '🇧🇷' },
  { pais: 'EC', nombre: 'Ecuador', indicativo: '+593', bandera: '🇪🇨' },
  { pais: 'BO', nombre: 'Bolivia', indicativo: '+591', bandera: '🇧🇴' },
  { pais: 'UY', nombre: 'Uruguay', indicativo: '+598', bandera: '🇺🇾' },
  { pais: 'PY', nombre: 'Paraguay', indicativo: '+595', bandera: '🇵🇾' },
]

// MercadoPago ne couvre que 7 des 10 pays ci-dessus (AR/BR/CL/CO/MX/PE/UY) -- voir
// lib/payments/mercadopagoDomains.ts qui gere deja son propre fallback PE pour EC/BO/PY sur le
// lien du panel developpeur uniquement. La monnaie, elle, reste correcte pour ces 3 pays ici.
export const MONEDA_POR_PAIS: Record<string, string> = {
  PE: 'PEN',
  BR: 'BRL',
  MX: 'MXN',
  CO: 'COP',
  CL: 'CLP',
  AR: 'ARS',
  UY: 'UYU',
  EC: 'USD', // Equateur dollarise depuis 2000, pas de monnaie nationale propre
  BO: 'BOB',
  PY: 'PYG',
}

export function monedaParaPais(pais: string): string {
  return MONEDA_POR_PAIS[pais] ?? 'PEN'
}

// Domaine MercadoPago par pays -- source unique, reutilisable partout ou on a besoin de
// construire une URL MercadoPago specifique au pays (ex. futur email d'onboarding).
export const MERCADOPAGO_DOMAINS: Record<string, string> = {
  AR: 'mercadopago.com.ar',
  BR: 'mercadopago.com.br',
  CL: 'mercadopago.cl',
  CO: 'mercadopago.com.co',
  MX: 'mercadopago.com.mx',
  PE: 'mercadopago.com.pe',
  UY: 'mercadopago.com.uy',
}

export function getMercadoPagoDevPanelUrl(pays: string): string {
  const domain = MERCADOPAGO_DOMAINS[pays] ?? MERCADOPAGO_DOMAINS.PE
  return `https://www.${domain}/developers/panel`
}

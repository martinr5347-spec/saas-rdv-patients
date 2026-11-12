-- Migration 050: moyen de paiement sur actos_realizados -- Agregar acto devient le seul point de
-- saisie manuelle d'argent dans la fiche patient (fusion avec "Enregistrer un revenu", retire de
-- /dashboard/ingresos). Nullable : ne casse pas les lignes historiques deja en base, pas de
-- backfill force. 'mercadopago' n'est jamais une valeur possible ici -- ces paiements restent
-- exclusivement dans appointments (automatiques, jamais saisis a la main).
alter table actos_realizados
  add column if not exists metodo_pago text
  check (metodo_pago is null or metodo_pago in ('efectivo', 'transferencia', 'otro'));

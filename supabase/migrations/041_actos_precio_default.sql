-- Migration 041: tarif par defaut optionnel par acte du catalogue (nullable -- un acte sans tarif
-- par defaut continue a fonctionner exactement comme avant, saisie manuelle du montant a chaque
-- ajout en fiche patient). Le backfill retroactif du catalogue d'actes des organisations creees
-- avant le seed automatique (migration 038, 26/10) est fait separement via un script one-shot qui
-- reutilise lib/patients/actosCatalog.ts::seedActosIfEmpty() -- pas de logique dupliquee en SQL ici.

alter table actos
  add column if not exists precio_default numeric(10,2) default null;

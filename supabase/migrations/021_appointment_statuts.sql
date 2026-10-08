-- Migration 021: étendre les statuts appointments
-- Ajoute confirmado et en_curso au cycle de vie d'un rendez-vous

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_statut_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_statut_check
  CHECK (statut IN ('pendiente', 'confirmado', 'en_curso', 'pagado', 'anulado'));

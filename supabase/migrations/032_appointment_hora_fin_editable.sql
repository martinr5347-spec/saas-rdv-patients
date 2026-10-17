-- Migration 032: contrainte de coherence sur hora_fin maintenant qu'il devient editable manuellement
-- (jusqu'ici seul le webhook Calendly l'ecrivait ; ajout de la protection avant d'ouvrir l'edition).

ALTER TABLE appointments
  ADD CONSTRAINT appointments_hora_fin_after_hora_cita
  CHECK (hora_fin IS NULL OR hora_fin > hora_cita);

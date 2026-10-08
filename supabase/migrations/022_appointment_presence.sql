-- Migration 022: suivi présence patient
-- présente = null → RDV pas encore marqué (futur ou oublié)
-- présente = true → patient présent
-- présente = false → no-show

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS presente boolean DEFAULT NULL;

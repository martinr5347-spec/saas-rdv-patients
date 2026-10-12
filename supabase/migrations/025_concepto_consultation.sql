ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS concepto_consultation text DEFAULT NULL;

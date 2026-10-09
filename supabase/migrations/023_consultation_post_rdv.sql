-- Migration 023: données post-consultation
-- montant encaissé en cabinet + date de naissance patient

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS montant_consultation numeric(10,2) DEFAULT NULL;

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS fecha_nacimiento date DEFAULT NULL;

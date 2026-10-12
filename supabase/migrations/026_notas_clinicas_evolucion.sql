-- Migration 026: evolucion de notas clinicas (edicion/suppression, alerta epinglada, categorias)

-- Catégorie optionnelle par note (texte libre choisi dans la liste configurée par l'organisation)
ALTER TABLE patient_notes
  ADD COLUMN IF NOT EXISTS categoria text DEFAULT NULL;

-- Alerte clinique épinglée : une seule par patient (ex. allergie), distincte du fil chronologique des notes.
-- Choix volontairement simple : un champ texte sur le patient plutôt qu'une table séparée — généraliste et facile à maintenir.
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS alerta_clinica text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS alerta_clinica_updated_at timestamptz DEFAULT NULL;

-- Liste des catégories de notes, configurable par organisation (modifiable dans Configuración)
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS categorias_notas text[] NOT NULL DEFAULT ARRAY['Antecedente', 'Alergia', 'Diagnóstico', 'Tratamiento', 'Seguimiento'];

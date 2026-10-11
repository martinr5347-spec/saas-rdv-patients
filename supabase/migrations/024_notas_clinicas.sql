-- Migration 024: notes cliniques confidentielles protégées par code d'accès

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS codigo_seguridad_hash text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS codigo_seguridad_updated_at timestamptz DEFAULT NULL;

CREATE TABLE IF NOT EXISTS patient_notes (
  id              uuid primary key default uuid_generate_v4(),
  patient_id      uuid not null references patients(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  contenido       text not null,
  created_at      timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_patient_notes_patient_id ON patient_notes(patient_id);

ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;

-- Meme pattern RLS que patients/appointments (voir 001_initial_schema.sql) :
-- isolation par organization_id via current_org_id(), pas de pattern nouveau.
create policy "tenant_isolation" on patient_notes
  using (organization_id = current_org_id() or is_platform_admin());

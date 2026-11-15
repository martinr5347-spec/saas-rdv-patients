-- Migration 054: transfert de photos telephone -> ordinateur par QR code (cf. prompt
-- notas-foto-transfer-qr). Chaque photo envoyee depuis le telephone est ecrite directement et
-- definitivement dans clinical-photos, avec note_id nullable jusqu'a son rattachement a une note
-- (meme principe que storage_path nullable pour les prescripciones en brouillon, migration 052).

alter table patient_note_photos alter column note_id drop not null;
alter table patient_note_photos add column if not exists patient_id uuid references patients(id) on delete cascade;

-- Backfill trivial : toutes les lignes existantes sont deja rattachees a une note, patient_id
-- deductible via note_id -> patient_notes.patient_id.
update patient_note_photos p
set patient_id = n.patient_id
from patient_notes n
where p.note_id = n.id
  and p.patient_id is null;

create index if not exists idx_patient_note_photos_patient_id on patient_note_photos (patient_id);

-- Jeton de transfert : un seul scan peut recevoir plusieurs photos tant qu'il reste valide (10 min)
-- -- pas de colonne photo_id, les photos s'y rattachent via patient_id + created_at >= created_at
-- du jeton + note_id is null (voir app/api/patients/[id]/photo-transfer/[token]/route.ts).
create table photo_transfer_tokens (
  id              uuid primary key default uuid_generate_v4(),
  token           text not null unique,
  organization_id uuid not null references organizations(id) on delete cascade,
  patient_id      uuid not null references patients(id) on delete cascade,
  created_by      uuid not null references users(id),
  status          text not null default 'pending' check (status in ('pending', 'expired', 'cancelled')),
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

create index idx_photo_transfer_tokens_token on photo_transfer_tokens (token);

alter table photo_transfer_tokens enable row level security;

create policy "tenant_isolation" on photo_transfer_tokens
  using (organization_id = current_org_id() or is_platform_admin());

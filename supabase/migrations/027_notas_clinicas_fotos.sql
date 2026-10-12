-- Migration 027: photos jointes aux notes cliniques (max 2 par note, bucket prive)

CREATE TABLE IF NOT EXISTS patient_note_photos (
  id              uuid primary key default uuid_generate_v4(),
  note_id         uuid not null references patient_notes(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  storage_path    text not null,
  created_at      timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_patient_note_photos_note_id ON patient_note_photos(note_id);

ALTER TABLE patient_note_photos ENABLE ROW LEVEL SECURITY;

create policy "tenant_isolation" on patient_note_photos
  using (organization_id = current_org_id() or is_platform_admin());

-- Bucket prive (contrairement a 'avatars' qui est public) -- ces photos sont des donnees cliniques sensibles.
insert into storage.buckets (id, name, public)
values ('clinical-photos', 'clinical-photos', false)
on conflict (id) do nothing;

-- Chemin de stockage attendu : {organization_id}/{note_id}/{filename} -- isolation par organisation,
-- coherent avec le pattern tenant_isolation deja utilise partout ailleurs (plutot que par utilisateur comme 'avatars').
drop policy if exists "clinical_photos_tenant_read" on storage.objects;
create policy "clinical_photos_tenant_read" on storage.objects
  for select using (
    bucket_id = 'clinical-photos'
    and ((storage.foldername(name))[1] = current_org_id()::text or is_platform_admin())
  );

drop policy if exists "clinical_photos_tenant_write" on storage.objects;
create policy "clinical_photos_tenant_write" on storage.objects
  for insert with check (
    bucket_id = 'clinical-photos'
    and ((storage.foldername(name))[1] = current_org_id()::text or is_platform_admin())
  );

drop policy if exists "clinical_photos_tenant_delete" on storage.objects;
create policy "clinical_photos_tenant_delete" on storage.objects
  for delete using (
    bucket_id = 'clinical-photos'
    and ((storage.foldername(name))[1] = current_org_id()::text or is_platform_admin())
  );

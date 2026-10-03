-- Profil personnel du praticien (distinct du nom/espace du cabinet) : nom complet,
-- specialite en texte libre, photo de profil. Utilises dans l'en-tete du dashboard
-- et la salutation de la page d'accueil.

alter table users add column if not exists nombre_completo text;
alter table users add column if not exists especialidad text;
alter table users add column if not exists foto_url text;

-- Bucket de stockage pour les photos de profil (public en lecture, un dossier par
-- utilisateur en ecriture, cf. policies ci-dessous).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_own_write" on storage.objects;
create policy "avatars_own_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_own_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

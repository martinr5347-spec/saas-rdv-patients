-- Migration 049: prescripciones (feuille de prescription simple, imprimable, signee a la main) --
-- numero 048 deja prise par drop_unipile.sql au moment de ce prompt.
--
-- Decision de Martin : pas d'ordonnance electronique officielle (aucune API tierce accessible et
-- pas chere au Perou -- pas de couverture Osigu, pas d'acces public DIGEMID) -- une feuille simple
-- que le praticien signe/tamponne lui-meme apres impression. Ce document n'a aucune valeur de
-- signature numerique (cf. disclaimer dans lib/pdf/prescripcionPdf.tsx).

alter table users add column if not exists numero_colegiatura text default null;

create table prescripciones (
  id                uuid primary key default uuid_generate_v4(),
  patient_id        uuid not null references patients(id) on delete cascade,
  organization_id   uuid not null references organizations(id) on delete cascade,
  created_by        uuid references users(id) on delete set null,
  fecha             date not null default current_date,
  medicamentos      jsonb not null default '[]'::jsonb,
  notas_adicionales text default null,
  storage_path      text not null,
  created_at        timestamptz not null default now()
);

create index idx_prescripciones_patient_id on prescripciones (patient_id);

alter table prescripciones enable row level security;

create policy "tenant_isolation" on prescripciones
  using (organization_id = current_org_id() or is_platform_admin());

-- Bucket prive, meme principe que 'clinical-photos' (migration 027) -- document medical sensible.
-- Nom technique en slug ('recetas-anteriores') -- un bucket Supabase Storage n'accepte pas les
-- espaces ni les accents dans son identifiant. Le libelle affiche a l'ecran (section/bouton dans la
-- fiche patient) est different et porte le vrai texte voulu par Martin, cf. messages/es.json et pt.json.
insert into storage.buckets (id, name, public)
values ('recetas-anteriores', 'recetas-anteriores', false)
on conflict (id) do nothing;

drop policy if exists "recetas_anteriores_tenant_read" on storage.objects;
create policy "recetas_anteriores_tenant_read" on storage.objects
  for select using (
    bucket_id = 'recetas-anteriores'
    and ((storage.foldername(name))[1] = current_org_id()::text or is_platform_admin())
  );

drop policy if exists "recetas_anteriores_tenant_write" on storage.objects;
create policy "recetas_anteriores_tenant_write" on storage.objects
  for insert with check (
    bucket_id = 'recetas-anteriores'
    and ((storage.foldername(name))[1] = current_org_id()::text or is_platform_admin())
  );

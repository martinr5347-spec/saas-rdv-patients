-- Migration 040: table reelle pour les sessions de saisie multi-categories (patient_note_sesiones),
-- remplace le simple uuid partage introduit par la migration 039 -- permet d'attacher un commentaire
-- final de session, en plus du regroupement deja existant par sesion_id.

create table patient_note_sesiones (
  id               uuid primary key default uuid_generate_v4(),
  patient_id       uuid not null references patients(id) on delete cascade,
  organization_id  uuid not null references organizations(id) on delete cascade,
  comentario_final text default null,
  created_at       timestamptz not null default now()
);

create index idx_patient_note_sesiones_patient_id on patient_note_sesiones (patient_id);

alter table patient_note_sesiones enable row level security;

create policy "tenant_isolation" on patient_note_sesiones
  using (organization_id = current_org_id() or is_platform_admin());

-- Backfill : les sessions deja creees depuis la migration 039 (sesion_id = simple uuid partage entre
-- notes, sans ligne associee nulle part) doivent recevoir une ligne ici avant d'ajouter la contrainte
-- FK ci-dessous -- sinon la contrainte echouerait pour toute session reelle deja enregistree.
-- comentario_final reste NULL (la fonctionnalite n'existait pas encore a ce moment-la).
insert into patient_note_sesiones (id, patient_id, organization_id, created_at)
select distinct on (pn.sesion_id)
  pn.sesion_id,
  pn.patient_id,
  pn.organization_id,
  pn.created_at
from patient_notes pn
where pn.sesion_id is not null
order by pn.sesion_id, pn.created_at
on conflict (id) do nothing;

-- patient_notes.sesion_id devient une vraie FK nullable (nullable preserve les notes historiques sans
-- session, cf. migration 039 -- aucune migration retroactive pour elles).
alter table patient_notes
  add constraint patient_notes_sesion_id_fkey
  foreign key (sesion_id) references patient_note_sesiones(id) on delete set null;

-- Migration 035: surcharges d'horaires par date precise ("mode personnalise").
-- Meme modele que org_availability (migration 031), mais clee par date exacte plutot que jour de
-- semaine recurrent -- pour les praticiens a emploi du temps irregulier (ex. activite ailleurs
-- certaines semaines), sans inventer de systeme de motifs repetitifs rigide.

create table org_availability_overrides (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  fecha           date not null,
  hora_inicio     time not null,
  hora_fin        time not null,
  created_at      timestamptz not null default now(),
  check (hora_fin > hora_inicio)
);

create index on org_availability_overrides(organization_id, fecha);

alter table org_availability_overrides enable row level security;

create policy "tenant_isolation" on org_availability_overrides
  using (organization_id = current_org_id() or is_platform_admin());

-- Migration 031: fondations de la reservation native (etape 1/4) -- disponibilites, pas encore de page publique

-- Identifiant public pour le futur lien de reservation (nucleo.clinic/reservar/{slug}).
-- Nullable : genere au premier enregistrement des disponibilites, pas a l'inscription.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Parametres de reservation (duree de consultation, marge, fenetre d'anticipation)
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS duracion_cita_min integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS buffer_min integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anticipacion_min_horas integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS anticipacion_max_dias integer NOT NULL DEFAULT 60;

-- Horaires d'ouverture hebdomadaires. Une ligne par jour ouvert (dia_semana 0=dimanche..6=samedi,
-- convention JS Date.getDay()). Le schema autorise plusieurs lignes par jour (horaires coupes,
-- ex. matin + apres-midi) meme si la V1 de l'UI (ce prompt) n'en propose qu'une par jour --
-- pas de migration a refaire si on ajoute les horaires coupes plus tard.
CREATE TABLE IF NOT EXISTS org_availability (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  dia_semana      integer not null check (dia_semana between 0 and 6),
  hora_inicio     time not null,
  hora_fin        time not null,
  created_at      timestamptz not null default now(),
  check (hora_fin > hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_org_availability_org ON org_availability(organization_id);

ALTER TABLE org_availability ENABLE ROW LEVEL SECURITY;

create policy "tenant_isolation" on org_availability
  using (organization_id = current_org_id() or is_platform_admin());

-- Dates bloquees ponctuelles (vacances, jour ferie) -- une ligne par jour bloque.
CREATE TABLE IF NOT EXISTS org_blocked_dates (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  fecha           date not null,
  motivo          text,
  created_at      timestamptz not null default now(),
  unique (organization_id, fecha)
);

ALTER TABLE org_blocked_dates ENABLE ROW LEVEL SECURITY;

create policy "tenant_isolation" on org_blocked_dates
  using (organization_id = current_org_id() or is_platform_admin());

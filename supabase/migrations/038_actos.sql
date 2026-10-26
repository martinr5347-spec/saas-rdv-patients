-- Catalogue d'actes facturables par organisation (base d'un vrai Pareto 80/20 dans Analisis).
-- Aucune notion structuree d'"acte" n'existait avant cette migration -- montant_consultation
-- (appointments) et ingresos_manuales.concepto restent du texte libre non structure, jamais migres
-- retroactivement ici (aucun mapping fiable possible).

create table actos (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  nombre              text not null,
  especialidad_origen text check (especialidad_origen is null or especialidad_origen in ('estetica_dermato', 'clinica_medica')),
  activo              boolean not null default true,
  created_at          timestamptz not null default now()
);

create index actos_org_activo_idx on actos (organization_id, activo);

alter table actos enable row level security;

create policy "tenant_isolation" on actos
  using (organization_id = current_org_id() or is_platform_admin());

-- Acte reellement realise, rattache a un patient, avec son montant -- 4e source de revenu
-- (en plus de appointments.monto_acompte, appointments.montant_consultation, ingresos_manuales).
-- acto_id XOR acto_texto_libre n'est pas impose (les deux pourraient coexister sans mal), mais au
-- moins l'un des deux doit etre renseigne -- sinon la ligne n'a aucun nom d'acte a afficher/grouper.
create table actos_realizados (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  patient_id      uuid not null references patients(id) on delete cascade,
  acto_id         uuid references actos(id) on delete set null,
  acto_texto_libre text,
  monto           numeric(10,2) not null,
  fecha           date not null,
  appointment_id  uuid references appointments(id) on delete set null,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz not null default now(),
  check (acto_id is not null or acto_texto_libre is not null)
);

create index actos_realizados_org_fecha_idx on actos_realizados (organization_id, fecha desc);
create index actos_realizados_patient_idx on actos_realizados (patient_id, fecha desc);

alter table actos_realizados enable row level security;

create policy "tenant_isolation" on actos_realizados
  using (organization_id = current_org_id() or is_platform_admin());

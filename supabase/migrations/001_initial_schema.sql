create extension if not exists "uuid-ossp";

-- ORGANIZATIONS (tenants)
create table organizations (
  id          uuid primary key default uuid_generate_v4(),
  nom         text not null,
  adresse     text,
  pays        text not null default 'PE',
  fuseau      text not null default 'America/Lima',
  langue      text not null default 'es',
  created_at  timestamptz not null default now()
);

-- USERS
create table users (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  role            text not null check (role in ('praticien', 'staff', 'admin')),
  nom             text,
  email           text not null,
  created_at      timestamptz not null default now()
);

-- SUBSCRIPTIONS (abonnements Stripe)
create table subscriptions (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  stripe_customer_id  text unique,
  stripe_sub_id       text unique,
  plan                text not null default 'fondateur',
  statut              text not null default 'pending'
                      check (statut in ('pending','active','past_due','canceled')),
  periode_debut       timestamptz,
  periode_fin         timestamptz,
  created_at          timestamptz not null default now()
);

-- ORG_SETTINGS (config par cabinet — un tenant = une ligne)
create table org_settings (
  organization_id     uuid primary key references organizations(id) on delete cascade,
  delai_paiement_h    integer not null default 12,
  delai_aviso_h       integer not null default 6,
  delai_rappel_h      integer not null default 24,
  monto_acompte       numeric(10,2) not null default 0,
  calendly_url        text,
  unipile_account_id  text,
  mp_access_token     text,
  mp_notification_url text,
  canal_email         boolean not null default true,
  canal_whatsapp      boolean not null default false,
  monnaie             text not null default 'PEN',
  updated_at          timestamptz not null default now()
);

-- PATIENTS
create table patients (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  nom             text not null,
  email           text,
  telefono        text,
  created_at      timestamptz not null default now(),
  unique (organization_id, telefono),
  unique (organization_id, email)
);

-- APPOINTMENTS
create table appointments (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  patient_id        uuid not null references patients(id) on delete restrict,
  fecha_cita        date not null,
  hora_cita         time not null,
  fecha_reserva     timestamptz not null default now(),
  notas             text,
  statut            text not null default 'pendiente'
                    check (statut in ('pendiente','pagado','anulado')),
  monto_acompte     numeric(10,2) not null,
  fecha_pago        timestamptz,
  link_pago         text,
  calendly_event_id text unique,
  mp_preference_id  text,
  mp_external_ref   text unique,
  created_at        timestamptz not null default now()
);

-- PAYMENTS
create table payments (
  id              uuid primary key default uuid_generate_v4(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  montant         numeric(10,2) not null,
  moyen           text not null default 'mercadopago',
  statut          text not null default 'pending'
                  check (statut in ('pending','approved','rejected')),
  provider_ref    text,
  created_at      timestamptz not null default now()
);

-- NOTIFICATIONS (journal anti-doublon — remplace les colonnes-drapeaux du Google Sheet)
create table notifications (
  id              uuid primary key default uuid_generate_v4(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  canal           text not null check (canal in ('email','whatsapp','sms')),
  type            text not null check (type in (
    'confirmation','aviso','pago','pago_praticien','anulacion','recordatorio'
  )),
  statut          text not null default 'pending'
                  check (statut in ('pending','sent','failed')),
  error_message   text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (appointment_id, canal, type)
);

-- MESSAGE_TEMPLATES (multi-langue, multi-canal)
create table message_templates (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  type            text not null,
  canal           text not null check (canal in ('email','whatsapp')),
  langue          text not null default 'es',
  sujet           text,
  corps           text not null,
  created_at      timestamptz not null default now(),
  unique (organization_id, type, canal, langue)
);

-- ROW LEVEL SECURITY
alter table organizations      enable row level security;
alter table users              enable row level security;
alter table subscriptions      enable row level security;
alter table org_settings       enable row level security;
alter table patients           enable row level security;
alter table appointments       enable row level security;
alter table payments           enable row level security;
alter table notifications      enable row level security;
alter table message_templates  enable row level security;

create or replace function current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from users where id = auth.uid()
$$;

create or replace function is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from users where id = auth.uid() and role = 'admin')
$$;

create policy "tenant_isolation" on organizations
  using (id = current_org_id() or is_platform_admin());

create policy "tenant_isolation" on users
  using (organization_id = current_org_id() or is_platform_admin());

create policy "tenant_isolation" on subscriptions
  using (organization_id = current_org_id() or is_platform_admin());

create policy "tenant_isolation" on org_settings
  using (organization_id = current_org_id() or is_platform_admin());

create policy "tenant_isolation" on patients
  using (organization_id = current_org_id() or is_platform_admin());

create policy "tenant_isolation" on appointments
  using (organization_id = current_org_id() or is_platform_admin());

create policy "tenant_isolation" on payments
  using (
    appointment_id in (
      select id from appointments where organization_id = current_org_id()
    ) or is_platform_admin()
  );

create policy "tenant_isolation" on notifications
  using (
    appointment_id in (
      select id from appointments where organization_id = current_org_id()
    ) or is_platform_admin()
  );

create policy "tenant_isolation" on message_templates
  using (organization_id = current_org_id() or organization_id is null or is_platform_admin());

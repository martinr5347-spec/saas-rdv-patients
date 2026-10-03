-- Module "Mis ingresos" : saisie manuelle des encaissements hors MercadoPago
-- (efectivo, transferencia, otro). Les encaissements MercadoPago ne sont pas
-- dupliques ici : ils restent dans appointments/payments et sont fusionnes a
-- l'affichage (voir app/dashboard/ingresos).
--
-- Ecart volontaire avec le brief : scope par organization_id (comme toutes les
-- autres tables du schema) plutot que par praticien_id individuel, pour rester
-- coherent avec le modele multi-tenant existant (un cabinet peut avoir un role
-- 'staff' en plus du praticien, qui doit voir les memes revenus).

create table ingresos_manuales (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  fecha           date not null,
  monto           numeric(10,2) not null,
  metodo_pago     text not null check (metodo_pago in ('efectivo', 'transferencia', 'otro')),
  paciente_nombre text,
  concepto        text,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index ingresos_manuales_org_fecha_idx on ingresos_manuales (organization_id, fecha desc);

alter table ingresos_manuales enable row level security;

create policy "tenant_isolation" on ingresos_manuales
  using (organization_id = current_org_id() or is_platform_admin());

grant select, insert, update, delete on ingresos_manuales to authenticated;
grant select, insert, update, delete on ingresos_manuales to service_role;

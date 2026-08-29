-- Les tables ont été créées via une connexion Postgres directe (pas via le dashboard/CLI Supabase),
-- donc les GRANT automatiques habituels de Supabase sur anon/authenticated/service_role n'ont pas été appliqués.
-- La sécurité au niveau ligne reste assurée par les policies RLS déjà en place (001_initial_schema.sql).

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select on all tables in schema public to anon;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

alter default privileges in schema public grant select on tables to anon;

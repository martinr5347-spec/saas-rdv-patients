-- Langue de l'interface du praticien (dashboard) : reglee une fois a l'inscription,
-- modifiable ensuite dans /dashboard/settings. Distincte de organizations.langue,
-- qui pilote la langue des messages envoyes aux patients.

alter table users add column if not exists idioma text not null default 'es';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_idioma_check'
  ) then
    alter table users add constraint users_idioma_check check (idioma in ('es', 'pt'));
  end if;
end $$;

-- Domaine d'activite du cabinet, saisi a l'inscription (selecteur "Area de
-- especializacion" / "Area de atuacao" sur /register). Purement informatif pour
-- l'instant (segmentation future) -- aucune logique produit n'en depend encore.

alter table organizations add column if not exists especialidad text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organizations_especialidad_check'
  ) then
    alter table organizations add constraint organizations_especialidad_check
      check (especialidad is null or especialidad in ('estetica_dermato', 'clinica_medica'));
  end if;
end $$;

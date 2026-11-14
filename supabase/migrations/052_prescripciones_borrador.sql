-- Migration 052: prescripciones en borrador (editable) avant generation du PDF, + suppression.
--
-- Retour de Rocio/Martin : aujourd'hui "Guardar" genere et stocke le PDF immediatement et
-- definitivement (voir ancien POST de app/api/patients/[id]/prescripciones/route.ts), sans
-- relecture possible avant ni suppression possible apres. storage_path devient nullable :
-- storage_path is null = brouillon (pas encore de PDF genere, donc encore editable via PUT),
-- storage_path renseigne = prescription "validee" (immuable, cf. route
-- [prescripcionId]/generar/route.ts qui est desormais la seule a generer le PDF).

alter table prescripciones alter column storage_path drop not null;

-- La policy delete n'avait jamais ete creee (voir migration 049) -- necessaire maintenant pour
-- supprimer le fichier d'une prescription validee sans laisser d'orphelin dans le bucket.
drop policy if exists "recetas_anteriores_tenant_delete" on storage.objects;
create policy "recetas_anteriores_tenant_delete" on storage.objects
  for delete using (
    bucket_id = 'recetas-anteriores'
    and ((storage.foldername(name))[1] = current_org_id()::text or is_platform_admin())
  );

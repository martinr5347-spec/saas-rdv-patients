-- Cout total de la consultation, optionnel : permet d'afficher le detail
-- "acompte maintenant + reste a payer sur place" dans les messages.
-- Null = cabinet n'a pas renseigne ce champ, le detail ne s'affiche pas.

alter table org_settings add column if not exists costo_total numeric(10,2);

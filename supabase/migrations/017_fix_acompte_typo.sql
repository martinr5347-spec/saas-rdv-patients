-- Faute de francais "acompte" glissee dans les templates espagnols (doit etre
-- "adelanto", cf. le libelle du champ "Monto del adelanto" dans Parametres).
-- Remplacement protege pour ne jamais toucher la variable {{monto_acompte}}
-- (qui doit rester inchangee, c'est le nom de colonne utilise par le dispatcher).

update message_templates
set
  sujet = replace(
    replace(
      replace(
        replace(sujet, 'monto_acompte', '@@MONTO_ACOMPTE@@'),
        'Acompte', 'Adelanto'
      ),
      'acompte', 'adelanto'
    ),
    '@@MONTO_ACOMPTE@@', 'monto_acompte'
  ),
  corps = replace(
    replace(
      replace(
        replace(corps, 'monto_acompte', '@@MONTO_ACOMPTE@@'),
        'Acompte', 'Adelanto'
      ),
      'acompte', 'adelanto'
    ),
    '@@MONTO_ACOMPTE@@', 'monto_acompte'
  )
where langue = 'es'
  and (coalesce(sujet, '') ilike '%acompte%' or corps ilike '%acompte%');

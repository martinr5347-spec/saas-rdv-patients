-- Migration 051: corrige l'incoherence deja visible en production -- statut 'confirmado' (affiche
-- "Libre"/"Disponible"/"Livre" depuis ce prompt) veut dire "aucun paiement en ligne du", ne doit
-- jamais coexister avec un acompte non nul. Donnee uniquement, pas de changement de schema --
-- statut lui-meme (valeur technique en base, check constraint) reste inchange.
update appointments set monto_acompte = 0 where statut = 'confirmado' and monto_acompte <> 0;

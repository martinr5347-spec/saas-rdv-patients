-- Heure de fin du RDV, telle qu'envoyee par Calendly (payload.event.end_time du
-- webhook invitee.created) -- permet de dimensionner correctement chaque creneau
-- dans la vue calendrier au lieu d'une duree fixe arbitraire. Nullable : les RDV
-- crees avant cette migration, ou si Calendly ne fournit pas end_time, n'en ont pas.

alter table appointments add column if not exists hora_fin time;

-- Migration 033: protection anti-double-booking reelle via contrainte d'exclusion Postgres.
-- Necessaire maintenant que les RDV peuvent etre crees par deux voies concurrentes
-- (webhook Calendly + soumission native), contrairement a avant ou Calendly etait
-- la seule source et gerait lui-meme l'unicite des creneaux.

create extension if not exists btree_gist;

-- Plage horaire calculee du RDV, stockee pour que la contrainte d'exclusion puisse
-- l'indexer. Repli a 30 min si hora_fin est absent (meme convention que
-- AppointmentsCalendarView.tsx et calcularSlots.ts -- ne pas inventer un autre repli).
alter table appointments
  add column rango_horario tsrange generated always as (
    tsrange(
      (fecha_cita + hora_cita)::timestamp,
      (fecha_cita + coalesce(hora_fin, hora_cita + interval '30 minutes'))::timestamp
    )
  ) stored;

alter table appointments
  add constraint appointments_no_solapamiento
  exclude using gist (
    organization_id with =,
    rango_horario with &&
  ) where (statut <> 'anulado');

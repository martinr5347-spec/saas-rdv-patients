-- Migration 044 : empeche la race condition sur la fusion de session par RDV (commit b80d9f3) --
-- deux requetes quasi simultanees pour le meme appointment_id ne doivent jamais pouvoir creer
-- deux patient_note_sesiones distinctes. Index unique partiel (pas une contrainte globale) :
-- appointment_id reste illimite en nombre quand il est null (sessions sans RDV associe).

create unique index idx_patient_note_sesiones_appointment_unique
  on patient_note_sesiones (appointment_id)
  where appointment_id is not null;

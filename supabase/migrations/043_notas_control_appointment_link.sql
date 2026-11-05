-- Migration 043: relie les sessions de notes cliniques a un RDV precis (comme actos_realizados
-- depuis la migration 038), et relie un nouveau RDV a la session de controle qui l'a declenche --
-- les deux colonnes restent nullables, aucune saisie existante n'est affectee.

alter table patient_note_sesiones
  add column appointment_id uuid references appointments(id) on delete set null;

create index idx_patient_note_sesiones_appointment_id on patient_note_sesiones (appointment_id);

alter table appointments
  add column origen_control_sesion_id uuid references patient_note_sesiones(id) on delete set null;

-- Session de notes "Control" a l'origine de la relance proximo_control en cours -- permet au lien de
-- relance (patient-recall.ts) de porter ?controlSesionId=... jusqu'a la reservation, qui le reporte a
-- son tour sur origen_control_sesion_id ci-dessus.
alter table patients
  add column proximo_control_sesion_id uuid references patient_note_sesiones(id) on delete set null;

-- Partie 5a : la relance "proximo control" pointait vers calendly_url (lien externe, obsolete
-- depuis le passage a la reservation native reservar/[slug]) -- renomme la variable de template en
-- reserva_url, dont la valeur reelle (reservar/[slug] ou, a defaut de slug migre, calendly_url en
-- fallback) est calculee cote code (lib/cron/patient-recall.ts), jamais en dur ici. Couvre aussi bien
-- les lignes par defaut (organization_id null, migration 029) que d'eventuelles lignes deja
-- personnalisees par une organisation.
update message_templates
  set corps = replace(corps, '{{calendly_url}}', '{{reserva_url}}')
  where type = 'control_recall';


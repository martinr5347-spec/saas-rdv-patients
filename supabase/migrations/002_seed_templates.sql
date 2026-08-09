-- Templates par défaut en espagnol pour tous les cabinets
-- organization_id null = fallback global ; chaque cabinet peut surcharger via son propre organization_id

insert into message_templates (organization_id, type, canal, langue, sujet, corps)
values
  (null, 'confirmation', 'email', 'es', 'Confirmación de tu cita', 'Hola {{nom_patient}}, tu cita está reservada para el {{fecha_cita}} a las {{hora_cita}}. Para confirmar, realiza el acompte de {{monto_acompte}} {{monnaie}} aquí: {{link_pago}}'),
  (null, 'confirmation', 'whatsapp', 'es', null, 'Hola {{nom_patient}}, tu cita del {{fecha_cita}} a las {{hora_cita}} está reservada. Acompte {{monto_acompte}} {{monnaie}}: {{link_pago}}'),
  (null, 'aviso', 'email', 'es', 'Recordatorio de pago — tu cita será cancelada', 'Hola {{nom_patient}}, aún no hemos recibido el acompte para tu cita del {{fecha_cita}} a las {{hora_cita}}. Si no pagas pronto, la cita será cancelada automáticamente: {{link_pago}}'),
  (null, 'aviso', 'whatsapp', 'es', null, 'Hola {{nom_patient}}, falta el acompte para tu cita del {{fecha_cita}}. Evita la cancelación pagando aquí: {{link_pago}}'),
  (null, 'pago', 'email', 'es', 'Acompte recibido — cita confirmada', 'Hola {{nom_patient}}, hemos recibido tu acompte de {{monto_acompte}} {{monnaie}}. Tu cita del {{fecha_cita}} a las {{hora_cita}} está confirmada.'),
  (null, 'pago', 'whatsapp', 'es', null, 'Hola {{nom_patient}}, recibimos tu acompte de {{monto_acompte}} {{monnaie}}. Cita del {{fecha_cita}} a las {{hora_cita}} confirmada.'),
  (null, 'pago_praticien', 'email', 'es', 'Acompte recibido — {{nom_patient}} el {{fecha_cita}}', '{{nom_patient}} vient de payer {{monto_acompte}} {{monnaie}} pour son RDV du {{fecha_cita}} à {{hora_cita}}.'),
  (null, 'anulacion', 'email', 'es', 'Cita cancelada por falta de pago', 'Hola {{nom_patient}}, tu cita del {{fecha_cita}} a las {{hora_cita}} ha sido cancelada automáticamente por no recibir el acompte a tiempo.'),
  (null, 'anulacion', 'whatsapp', 'es', null, 'Hola {{nom_patient}}, tu cita del {{fecha_cita}} a las {{hora_cita}} fue cancelada por falta de acompte.'),
  (null, 'recordatorio', 'email', 'es', 'Recordatorio de cita', 'Hola {{nom_patient}}, te recordamos tu cita del {{fecha_cita}} a las {{hora_cita}}.'),
  (null, 'recordatorio', 'whatsapp', 'es', null, 'Hola {{nom_patient}}, recordatorio: cita el {{fecha_cita}} a las {{hora_cita}}.')
on conflict (organization_id, type, canal, langue) do update set
  sujet = excluded.sujet,
  corps = excluded.corps,
  updated_at = now();

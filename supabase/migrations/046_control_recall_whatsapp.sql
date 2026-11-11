-- Migration 046: canal whatsapp pour le rappel de controle (control_recall)
--
-- Jusqu'ici control_recall n'avait qu'un canal (email) -- cf. CONTROL_RECALL_VARIANTS
-- (lib/dispatcher/templateVariants.ts), desormais restructure avec une dimension Canal comme les
-- 7 autres types de notification. Templates par defaut (es + pt) pour canal='whatsapp', meme
-- message que l'email par defaut ci-dessus mot pour mot (titre + paragraphe + texte du bouton),
-- converti en texte brut -- necessaires pour toute organisation qui n'a jamais personnalise sa
-- section "Plantillas" (sinon lib/cron/patient-recall.ts ne trouverait aucun template whatsapp
-- pour ces organisations, cf. le meme pattern org-override-puis-defaut que sendRecallEmail()).
INSERT INTO message_templates (organization_id, type, canal, langue, sujet, corps)
SELECT NULL, 'control_recall', 'whatsapp', 'es', NULL,
  '📅 Es momento de tu control

Hola {{nom_patient}}, ha llegado el momento de programar tu consulta de control con {{nombre_cabinet}}.
{{#if reserva_url}}
Reservar mi cita:
{{reserva_url}}{{/if}}'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates WHERE organization_id IS NULL AND type = 'control_recall' AND canal = 'whatsapp' AND langue = 'es'
);

INSERT INTO message_templates (organization_id, type, canal, langue, sujet, corps)
SELECT NULL, 'control_recall', 'whatsapp', 'pt', NULL,
  '📅 É hora do seu retorno

Olá {{nom_patient}}, chegou a hora de agendar sua consulta de retorno com {{nombre_cabinet}}.
{{#if reserva_url}}
Agendar minha consulta:
{{reserva_url}}{{/if}}'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates WHERE organization_id IS NULL AND type = 'control_recall' AND canal = 'whatsapp' AND langue = 'pt'
);

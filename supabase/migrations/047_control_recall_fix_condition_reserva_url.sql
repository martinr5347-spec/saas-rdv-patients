-- Migration 047: corrige la condition {{#if calendly_url}} jamais vraie dans control_recall (email)
--
-- La migration 043 a renomme la variable dans le lien ({{calendly_url}} -> {{reserva_url}}) pour
-- tous les message_templates de type control_recall, mais a oublie de renommer le nom de la
-- condition qui entoure ce lien -- le texte contenait toujours {{#if calendly_url}}...{{/if}}.
-- renderControlRecallTemplate() (lib/cron/patient-recall.ts) ne construit son objet conditions
-- qu'avec la cle reserva_url : conditions['calendly_url'] est donc toujours undefined (falsy), et
-- le bloc etait systematiquement retire -- le bouton de reservation ne s'affichait jamais dans le
-- rappel de controle par email. On corrige ici le nom de la condition, pas le moteur de rendu
-- (la bonne variable est bien reserva_url).
update message_templates
  set corps = replace(corps, '{{#if calendly_url}}', '{{#if reserva_url}}')
  where type = 'control_recall' and corps like '%{{#if calendly_url}}%';

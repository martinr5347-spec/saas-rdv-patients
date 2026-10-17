-- Migration 034: lien de gestion patient (annulation/reprogrammation en libre-service) +
-- nouveaux types de notification (reprogramacion cote patient, cambio_praticien cote cabinet).

-- Volontairement un UUID distinct de appointments.id : ne jamais exposer publiquement
-- l'id interne comme capacite d'acces, meme si un UUID est deja impredictible en pratique --
-- separer "identifiant" et "capacite d'acces public" est la bonne pratique ici.
-- DEFAULT uuid_generate_v4() etant volatile, Postgres reecrit la table et genere une
-- valeur distincte pour chaque ligne existante automatiquement (pas de backfill separe a ecrire).
alter table appointments
  add column gestion_token uuid not null default uuid_generate_v4() unique;

alter table notifications
  drop constraint if exists notifications_type_check;

alter table notifications
  add constraint notifications_type_check
  check (type in (
    'confirmation','aviso','pago','pago_praticien','anulacion','recordatorio',
    'reprogramacion','cambio_praticien'
  ));

-- Templates par defaut (organization_id null = repli global), memes langues/canaux que les
-- types patient existants pour 'reprogramacion' (email + whatsapp, comme confirmation/aviso/etc.) ;
-- 'cambio_praticien' suit le pattern de pago_praticien : email seulement, pas de variante.
insert into message_templates (organization_id, type, canal, langue, sujet, corps) values
  (null, 'reprogramacion', 'email', 'es', 'Tu cita fue reprogramada',
   '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Tu cita fue reprogramada</h2><p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Hola {{nom_patient}}, tu cita con <strong>{{nombre_cabinet}}</strong> fue movida a:</p><p style="margin:0 0 20px;font-size:15px;line-height:1.5;"><strong>{{fecha_cita}}</strong> a las <strong>{{hora_cita}}</strong></p></div>'),
  (null, 'reprogramacion', 'whatsapp', 'es', null,
   '🔄 Hola {{nom_patient}}! Tu cita con {{nombre_cabinet}} fue reprogramada:\n{{fecha_cita}} a las {{hora_cita}}'),
  (null, 'reprogramacion', 'email', 'pt', 'Sua consulta foi remarcada',
   '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Sua consulta foi remarcada</h2><p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Olá {{nom_patient}}, sua consulta com <strong>{{nombre_cabinet}}</strong> foi movida para:</p><p style="margin:0 0 20px;font-size:15px;line-height:1.5;"><strong>{{fecha_cita}}</strong> às <strong>{{hora_cita}}</strong></p></div>'),
  (null, 'reprogramacion', 'whatsapp', 'pt', null,
   '🔄 Olá {{nom_patient}}! Sua consulta com {{nombre_cabinet}} foi remarcada:\n{{fecha_cita}} às {{hora_cita}}'),
  (null, 'cambio_praticien', 'email', 'es', '{{#if cancelado}}Cita cancelada por el paciente{{else}}Cita reprogramada por el paciente{{/if}} — {{nom_patient}}',
   '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><p style="margin:0 0 12px;font-size:15px;line-height:1.5;">{{nom_patient}} {{#if cancelado}}canceló{{else}}reprogramó{{/if}} su cita del {{fecha_cita}} a las {{hora_cita}}.</p>{{#if cancelado}}<p style="margin:0;font-size:13px;color:#6b7280;">Si la cita ya estaba pagada, no se generó ningún reembolso automático — revisa MercadoPago si corresponde reembolsar.</p>{{/if}}</div>'),
  (null, 'cambio_praticien', 'email', 'pt', '{{#if cancelado}}Consulta cancelada pelo paciente{{else}}Consulta remarcada pelo paciente{{/if}} — {{nom_patient}}',
   '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><p style="margin:0 0 12px;font-size:15px;line-height:1.5;">{{nom_patient}} {{#if cancelado}}cancelou{{else}}remarcou{{/if}} sua consulta do dia {{fecha_cita}} às {{hora_cita}}.</p>{{#if cancelado}}<p style="margin:0;font-size:13px;color:#6b7280;">Se a consulta já estava paga, nenhum reembolso automático foi gerado — verifique o MercadoPago se for o caso.</p>{{/if}}</div>');

-- Le lien de gestion doit apparaitre dans l'email de confirmation existant (Calendly ET reservation
-- native en beneficient tous les deux, meme template). dispatch() lit directement ces lignes --
-- organization_id null -- pour les organisations qui n'ont jamais personnalise leur message de
-- confirmation ; les organisations qui ont deja un override seront mises a jour la prochaine fois
-- qu'elles enregistrent Configuracion (meme comportement que toute evolution de template existante).
update message_templates
set corps = replace(
  corps,
  '</div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">',
  '<p style="margin:20px 0 0;text-align:center;"><a href="{{gestion_link}}" style="color:#6b7280;font-size:13px;text-decoration:underline;">Cancelar o reprogramar</a></p>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">'
)
where organization_id is null and type = 'confirmation' and canal = 'email' and langue = 'es';

update message_templates
set corps = replace(
  corps,
  '</div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">',
  '<p style="margin:20px 0 0;text-align:center;"><a href="{{gestion_link}}" style="color:#6b7280;font-size:13px;text-decoration:underline;">Cancelar ou remarcar</a></p>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">'
)
where organization_id is null and type = 'confirmation' and canal = 'email' and langue = 'pt';

-- Migration 042: solicitud automatique d'avis Google apres RDV. (Note: le prompt d'origine
-- parlait de "043_solicitud_resena.sql" -- 041 etant la derniere migration existante, le bon
-- numero est 042.)

alter table org_settings
  add column google_review_link text null,
  add column solicitud_resena_activa boolean not null default false,
  add column solicitud_resena_delay_dias integer not null default 3;

alter table notifications
  drop constraint if exists notifications_type_check;

alter table notifications
  add constraint notifications_type_check
  check (type in (
    'confirmation','aviso','pago','pago_praticien','anulacion','recordatorio',
    'reprogramacion','cambio_praticien','solicitud_resena'
  ));

-- Templates par defaut (organization_id null = repli global) -- variante "standard" uniquement :
-- contrairement aux 6 types generiques existants, 'solicitud_resena' n'est pas dans la liste
-- NOTIFICATION_TYPES de SettingsView/actions.ts (pas de selecteur standard/calido expose pour ce
-- type, la demande ne portait que sur lien/delai/toggle) -- donc aucun override org-specifique
-- n'est jamais ecrit automatiquement, dispatch()/loadTemplate() retombe toujours sur ces lignes.
insert into message_templates (organization_id, type, canal, langue, sujet, corps) values
  (null, 'solicitud_resena', 'email', 'es', '¿Cómo fue tu experiencia?',
   '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, gracias por confiar en mí para tu última consulta.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Si te sientes cómodo compartiendo tu experiencia, puedes dejar una reseña aquí:</p><a href="{{google_review_link}}" style="display:block;text-align:center;background:#ca8a04;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Dejar mi reseña</a><p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#4b5563;">Tu opinión me ayuda mucho.<br>Saludos,<br>{{praticien}}</p></div>'),
  (null, 'solicitud_resena', 'whatsapp', 'es', null,
   '⭐ Hola {{nom_patient}} 👋\n\nEspero que te sientas muy bien después de tu consulta. Si tienes un minuto, me ayudaría mucho que dejes tu opinión aquí:\n{{google_review_link}}\n\n¡Gracias!'),
  (null, 'solicitud_resena', 'email', 'pt', 'Como foi sua experiência?',
   '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;">Olá {{nom_patient}}, obrigado por confiar em mim para sua última consulta.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Se você se sentir confortável em compartilhar sua experiência, pode deixar uma avaliação aqui:</p><a href="{{google_review_link}}" style="display:block;text-align:center;background:#ca8a04;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Deixar minha avaliação</a><p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#4b5563;">Sua opinião me ajuda muito.<br>Um abraço,<br>{{praticien}}</p></div>'),
  (null, 'solicitud_resena', 'whatsapp', 'pt', null,
   '⭐ Olá {{nom_patient}} 👋\n\nEspero que você esteja se sentindo muito bem depois da sua consulta. Se tiver um minuto, me ajudaria muito que você deixasse sua opinião aqui:\n{{google_review_link}}\n\nObrigado!');

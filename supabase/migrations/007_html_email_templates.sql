-- Mise en forme HTML des templates email par défaut (canal='email' uniquement).
-- Les templates whatsapp restent en texte brut, inchangés.
-- Nouvelle variable disponible dans les templates : {{nombre_cabinet}}

update message_templates set sujet = 'Confirmación de tu cita', corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Tu cita está reservada</h2>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Hola {{nom_patient}}, tu cita con {{nombre_cabinet}} está reservada para el <strong>{{fecha_cita}} a las {{hora_cita}}</strong>.</p>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">Para confirmarla, realiza el acompte de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>
  <a href="{{link_pago}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px;font-weight:600;">Pagar acompte</a>
  <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">{{nombre_cabinet}}</p>
</div>'
where organization_id is null and type = 'confirmation' and canal = 'email' and langue = 'es';

update message_templates set sujet = 'Recordatorio de pago — tu cita será cancelada', corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:20px;color:#b45309;">Falta tu acompte</h2>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Hola {{nom_patient}}, aún no hemos recibido el acompte para tu cita del <strong>{{fecha_cita}} a las {{hora_cita}}</strong> con {{nombre_cabinet}}.</p>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">Si no pagas pronto, la cita será cancelada automáticamente.</p>
  <a href="{{link_pago}}" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px;font-weight:600;">Pagar acompte ahora</a>
</div>'
where organization_id is null and type = 'aviso' and canal = 'email' and langue = 'es';

update message_templates set sujet = 'Acompte recibido — cita confirmada', corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:20px;color:#15803d;">¡Pago recibido!</h2>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Hola {{nom_patient}}, hemos recibido tu acompte de <strong>{{monto_acompte}} {{monnaie}}</strong>.</p>
  <p style="margin:0;font-size:15px;line-height:1.5;">Tu cita del <strong>{{fecha_cita}} a las {{hora_cita}}</strong> con {{nombre_cabinet}} está confirmada. ¡Te esperamos!</p>
</div>'
where organization_id is null and type = 'pago' and canal = 'email' and langue = 'es';

update message_templates set sujet = '✅ Acompte recibido — {{nom_patient}} el {{fecha_cita}}', corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">Acompte recibido</h2>
  <p style="margin:0;font-size:15px;line-height:1.5;"><strong>{{nom_patient}}</strong> acaba de pagar <strong>{{monto_acompte}} {{monnaie}}</strong> para su cita del {{fecha_cita}} a las {{hora_cita}}.</p>
</div>'
where organization_id is null and type = 'pago_praticien' and canal = 'email' and langue = 'es';

update message_templates set sujet = 'Cita cancelada por falta de pago', corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:20px;color:#b91c1c;">Cita cancelada</h2>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Hola {{nom_patient}}, tu cita del <strong>{{fecha_cita}} a las {{hora_cita}}</strong> con {{nombre_cabinet}} ha sido cancelada automáticamente por no recibir el acompte a tiempo.</p>
  <p style="margin:0;font-size:15px;line-height:1.5;">Si deseas reagendar, no dudes en contactarnos.</p>
</div>'
where organization_id is null and type = 'anulacion' and canal = 'email' and langue = 'es';

update message_templates set sujet = 'Recordatorio de cita', corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Te esperamos</h2>
  <p style="margin:0;font-size:15px;line-height:1.5;">Hola {{nom_patient}}, te recordamos tu cita del <strong>{{fecha_cita}} a las {{hora_cita}}</strong> con {{nombre_cabinet}}.</p>
</div>'
where organization_id is null and type = 'recordatorio' and canal = 'email' and langue = 'es';

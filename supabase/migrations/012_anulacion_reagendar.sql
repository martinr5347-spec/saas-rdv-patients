-- Ajoute un bouton "Reagendar" pointant vers l'URL Calendly du cabinet
-- dans l'email d'annulation automatique (es + pt).

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#b91c1c;background:linear-gradient(135deg,#b91c1c,#991b1b);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#10060;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Cita cancelada</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, tu cita con <strong>{{nombre_cabinet}}</strong> ha sido cancelada autom&#225;ticamente por no recibir el acompte a tiempo:</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">a las {{hora_cita}}</div>
    </div>
    {{#if calendly_url}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Si deseas reagendar, hazlo aqu&#237; mismo:</p>
    <a href="{{calendly_url}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Reagendar cita</a>{{/if}}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'anulacion' and canal = 'email' and langue = 'es';

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#b91c1c;background:linear-gradient(135deg,#b91c1c,#991b1b);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#10060;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Consulta cancelada</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Ol&#225; {{nom_patient}}, sua consulta com <strong>{{nombre_cabinet}}</strong> foi cancelada automaticamente por n&#227;o recebermos o sinal a tempo:</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">&#224;s {{hora_cita}}</div>
    </div>
    {{#if calendly_url}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Se quiser reagendar, fa&#231;a aqui mesmo:</p>
    <a href="{{calendly_url}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Reagendar consulta</a>{{/if}}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'anulacion' and canal = 'email' and langue = 'pt';

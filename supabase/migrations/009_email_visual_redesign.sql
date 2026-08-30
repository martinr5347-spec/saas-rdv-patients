-- Refonte visuelle des templates email (es + pt) : bandeau coloré par type de
-- notification, encart date/heure mis en valeur, carte avec bordure arrondie.
-- Sujets inchangés, seul le corps est modifié.

-- ===== ESPAGNOL =====

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#2563eb;background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#128197;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Tu cita est&#225; reservada</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, tu cita con <strong>{{nombre_cabinet}}</strong> est&#225; reservada para:</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">a las {{hora_cita}}</div>
    </div>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Para confirmarla, realiza el acompte de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar acompte</a>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'confirmation' and canal = 'email' and langue = 'es';

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#b45309;background:linear-gradient(135deg,#b45309,#92400e);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#9200;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Falta tu acompte</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, a&#250;n no hemos recibido el acompte para tu cita con <strong>{{nombre_cabinet}}</strong>:</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">a las {{hora_cita}}</div>
    </div>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Si no pagas pronto, la cita ser&#225; cancelada autom&#225;ticamente.</p>
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#b45309;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar acompte ahora</a>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'aviso' and canal = 'email' and langue = 'es';

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#15803d;background:linear-gradient(135deg,#15803d,#166534);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#9989;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">&#161;Pago recibido!</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, hemos recibido tu acompte de <strong>{{monto_acompte}} {{monnaie}}</strong>.</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">a las {{hora_cita}}</div>
    </div>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">Tu cita con <strong>{{nombre_cabinet}}</strong> est&#225; confirmada. &#161;Te esperamos!</p>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'pago' and canal = 'email' and langue = 'es';

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#111827;background:linear-gradient(135deg,#111827,#1f2937);padding:24px;text-align:center;">
    <div style="font-size:32px;line-height:1;margin:0 0 6px;">&#128176;</div>
    <h1 style="margin:0;font-size:17px;color:#ffffff;font-weight:700;">Acompte recibido</h1>
  </div>
  <div style="padding:22px 24px;">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;"><strong>{{nom_patient}}</strong> acaba de pagar <strong>{{monto_acompte}} {{monnaie}}</strong> para su cita:</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:14px 18px;text-align:center;">
      <div style="font-size:16px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">a las {{hora_cita}}</div>
    </div>
  </div>
</div>'
where organization_id is null and type = 'pago_praticien' and canal = 'email' and langue = 'es';

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
    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">Si deseas reagendar, no dudes en contactarnos.</p>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'anulacion' and canal = 'email' and langue = 'es';

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#0891b2;background:linear-gradient(135deg,#0891b2,#0e7490);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#128276;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Te esperamos</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, te recordamos tu cita con <strong>{{nombre_cabinet}}</strong>:</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">a las {{hora_cita}}</div>
    </div>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'recordatorio' and canal = 'email' and langue = 'es';

-- ===== PORTUGAIS (pt-BR) =====

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#2563eb;background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#128197;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Sua consulta est&#225; reservada</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Ol&#225; {{nom_patient}}, sua consulta com <strong>{{nombre_cabinet}}</strong> est&#225; reservada para:</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">&#224;s {{hora_cita}}</div>
    </div>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Para confirmar, realize o sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar sinal</a>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'confirmation' and canal = 'email' and langue = 'pt';

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#b45309;background:linear-gradient(135deg,#b45309,#92400e);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#9200;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Falta o seu sinal</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Ol&#225; {{nom_patient}}, ainda n&#227;o recebemos o sinal da sua consulta com <strong>{{nombre_cabinet}}</strong>:</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">&#224;s {{hora_cita}}</div>
    </div>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Se n&#227;o pagar em breve, a consulta ser&#225; cancelada automaticamente.</p>
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#b45309;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar sinal agora</a>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'aviso' and canal = 'email' and langue = 'pt';

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#15803d;background:linear-gradient(135deg,#15803d,#166534);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#9989;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Pagamento recebido!</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Ol&#225; {{nom_patient}}, recebemos o seu sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>.</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">&#224;s {{hora_cita}}</div>
    </div>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">Sua consulta com <strong>{{nombre_cabinet}}</strong> est&#225; confirmada. Te esperamos!</p>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'pago' and canal = 'email' and langue = 'pt';

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#111827;background:linear-gradient(135deg,#111827,#1f2937);padding:24px;text-align:center;">
    <div style="font-size:32px;line-height:1;margin:0 0 6px;">&#128176;</div>
    <h1 style="margin:0;font-size:17px;color:#ffffff;font-weight:700;">Sinal recebido</h1>
  </div>
  <div style="padding:22px 24px;">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;"><strong>{{nom_patient}}</strong> acabou de pagar <strong>{{monto_acompte}} {{monnaie}}</strong> para a consulta:</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:14px 18px;text-align:center;">
      <div style="font-size:16px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">&#224;s {{hora_cita}}</div>
    </div>
  </div>
</div>'
where organization_id is null and type = 'pago_praticien' and canal = 'email' and langue = 'pt';

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
    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">Se quiser reagendar, entre em contato conosco.</p>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'anulacion' and canal = 'email' and langue = 'pt';

update message_templates set corps =
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:#0891b2;background:linear-gradient(135deg,#0891b2,#0e7490);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#128276;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Te esperamos</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Ol&#225; {{nom_patient}}, lembramos da sua consulta com <strong>{{nombre_cabinet}}</strong>:</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">&#224;s {{hora_cita}}</div>
    </div>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'recordatorio' and canal = 'email' and langue = 'pt';

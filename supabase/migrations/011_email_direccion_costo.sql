-- Ajoute l'adresse du cabinet (si renseignee) et le detail cout total /
-- acompte / reste a payer (si costo_total renseigne) aux templates email
-- confirmation, aviso, pago et recordatorio (es + pt). anulacion et
-- pago_praticien restent inchanges (pas pertinent).
--
-- Utilise la syntaxe conditionnelle {{#if variable}}...{{/if}} geree par
-- renderTemplate() dans lib/dispatcher/index.ts : le bloc est retire si la
-- variable est vide/absente pour ce cabinet.

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
      {{#if direccion}}<div style="font-size:13px;color:#6b7280;margin-top:8px;">&#128205; {{direccion}}</div>{{/if}}
    </div>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Para confirmarla, realiza el acompte de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">Costo total de la consulta: <strong>{{costo_total}} {{monnaie}}</strong> &mdash; {{monto_acompte}} {{monnaie}} de acompte ahora y <strong>{{resto_pagar}} {{monnaie}}</strong> en el consultorio el d&#237;a de tu cita.</p>{{/if}}
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
      {{#if direccion}}<div style="font-size:13px;color:#6b7280;margin-top:8px;">&#128205; {{direccion}}</div>{{/if}}
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
      {{#if direccion}}<div style="font-size:13px;color:#6b7280;margin-top:8px;">&#128205; {{direccion}}</div>{{/if}}
    </div>
    {{#if costo_desglose}}<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280;">Recuerda llevar <strong>{{resto_pagar}} {{monnaie}}</strong> el d&#237;a de tu cita (costo total: {{costo_total}} {{monnaie}}).</p>{{/if}}
    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">Tu cita con <strong>{{nombre_cabinet}}</strong> est&#225; confirmada. &#161;Te esperamos!</p>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'pago' and canal = 'email' and langue = 'es';

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
      {{#if direccion}}<div style="font-size:13px;color:#6b7280;margin-top:8px;">&#128205; {{direccion}}</div>{{/if}}
    </div>
    {{#if costo_desglose}}<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">No olvides llevar <strong>{{resto_pagar}} {{monnaie}}</strong> el d&#237;a de tu cita.</p>{{/if}}
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
      {{#if direccion}}<div style="font-size:13px;color:#6b7280;margin-top:8px;">&#128205; {{direccion}}</div>{{/if}}
    </div>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Para confirmar, realize o sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">Valor total da consulta: <strong>{{costo_total}} {{monnaie}}</strong> &mdash; {{monto_acompte}} {{monnaie}} de sinal agora e <strong>{{resto_pagar}} {{monnaie}}</strong> no consult&#243;rio no dia da consulta.</p>{{/if}}
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
      {{#if direccion}}<div style="font-size:13px;color:#6b7280;margin-top:8px;">&#128205; {{direccion}}</div>{{/if}}
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
      {{#if direccion}}<div style="font-size:13px;color:#6b7280;margin-top:8px;">&#128205; {{direccion}}</div>{{/if}}
    </div>
    {{#if costo_desglose}}<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280;">Lembre-se de levar <strong>{{resto_pagar}} {{monnaie}}</strong> no dia da consulta (valor total: {{costo_total}} {{monnaie}}).</p>{{/if}}
    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">Sua consulta com <strong>{{nombre_cabinet}}</strong> est&#225; confirmada. Te esperamos!</p>
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'pago' and canal = 'email' and langue = 'pt';

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
      {{#if direccion}}<div style="font-size:13px;color:#6b7280;margin-top:8px;">&#128205; {{direccion}}</div>{{/if}}
    </div>
    {{#if costo_desglose}}<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">N&#227;o esque&#231;a de levar <strong>{{resto_pagar}} {{monnaie}}</strong> no dia da consulta.</p>{{/if}}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'recordatorio' and canal = 'email' and langue = 'pt';

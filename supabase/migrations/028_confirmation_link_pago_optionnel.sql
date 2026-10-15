-- Migration 028: rend le bouton/lien de paiement du template "confirmation" conditionnel
-- a {{link_pago}} (nouvelle condition ajoutee dans renderTemplate(), lib/dispatcher/index.ts).
-- Necessaire car un RDV cree avec un acompte configure a 0 passe directement au statut
-- 'confirmado' (voir app/api/webhooks/calendly/route.ts) et n'a plus de link_pago genere --
-- sans ce changement, le bouton de paiement afficherait une URL vide.
--
-- Le moteur {{#if}} (renderTemplate) ne supporte pas l'imbrication ni {{else}} -- on
-- garde donc le bloc {{#if costo_desglose}} existant tel quel, en sibling (non imbrique)
-- des deux nouveaux blocs {{#if link_pago}} (paragraphe d'intro + bouton), plutot que de
-- l'envelopper dedans.
--
-- Ne couvre que les templates par defaut (organization_id is null). Un cabinet qui a deja
-- selectionne une variante de message dans Configuracion a une copie materialisee de ce
-- template avec son propre organization_id -- cette migration ne la touche pas (voir
-- rapport de livraison).

-- ===== EMAIL ESPAGNOL =====

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
    {{#if link_pago}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Para confirmarla, realiza el adelanto de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>{{/if}}
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">Costo total de la consulta: <strong>{{costo_total}} {{monnaie}}</strong> &mdash; {{monto_acompte}} {{monnaie}} de adelanto ahora y <strong>{{resto_pagar}} {{monnaie}}</strong> en el consultorio el d&#237;a de tu cita.</p>{{/if}}
    {{#if link_pago}}<a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar adelanto</a>{{/if}}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'confirmation' and canal = 'email' and langue = 'es';

-- ===== EMAIL PORTUGUES =====

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
    {{#if link_pago}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Para confirmar, realize o sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>{{/if}}
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">Valor total da consulta: <strong>{{costo_total}} {{monnaie}}</strong> &mdash; {{monto_acompte}} {{monnaie}} de sinal agora e <strong>{{resto_pagar}} {{monnaie}}</strong> no consult&#243;rio no dia da consulta.</p>{{/if}}
    {{#if link_pago}}<a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar sinal</a>{{/if}}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
where organization_id is null and type = 'confirmation' and canal = 'email' and langue = 'pt';

-- ===== WHATSAPP ESPAGNOL =====

update message_templates set corps = E'\U0001F4C5 Hola {{nom_patient}}!\n\nTu cita con {{nombre_cabinet}} esta reservada:\n{{fecha_cita}} a las {{hora_cita}}\n{{#if direccion}}\U0001F4CD {{direccion}}\n{{/if}}\n{{#if link_pago}}Para confirmarla, realiza el adelanto de {{monto_acompte}} {{monnaie}}:\n{{/if}}{{#if costo_desglose}}(Costo total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} en el consultorio)\n{{/if}}{{#if link_pago}}{{link_pago}}{{/if}}'
where organization_id is null and type = 'confirmation' and canal = 'whatsapp' and langue = 'es';

-- ===== WHATSAPP PORTUGUES =====

update message_templates set corps = E'\U0001F4C5 Ola {{nom_patient}}!\n\nSua consulta com {{nombre_cabinet}} esta reservada:\n{{fecha_cita}} as {{hora_cita}}\n{{#if direccion}}\U0001F4CD {{direccion}}\n{{/if}}\n{{#if link_pago}}Para confirmar, realize o sinal de {{monto_acompte}} {{monnaie}}:\n{{/if}}{{#if costo_desglose}}(Valor total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} no consultorio)\n{{/if}}{{#if link_pago}}{{link_pago}}{{/if}}'
where organization_id is null and type = 'confirmation' and canal = 'whatsapp' and langue = 'pt';

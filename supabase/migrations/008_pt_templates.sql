-- Templates par défaut en portugais (pt-BR), pour les cabinets avec organizations.langue = 'pt'
-- Miroir exact des types/canaux de 002_seed_templates.sql, en HTML pour les emails (cohérent avec 007)

insert into message_templates (organization_id, type, canal, langue, sujet, corps)
values
  (null, 'confirmation', 'email', 'pt', 'Confirmação da sua consulta',
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Sua consulta está reservada</h2>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Olá {{nom_patient}}, sua consulta com {{nombre_cabinet}} está reservada para <strong>{{fecha_cita}} às {{hora_cita}}</strong>.</p>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">Para confirmar, realize o sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>
  <a href="{{link_pago}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px;font-weight:600;">Pagar sinal</a>
  <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">{{nombre_cabinet}}</p>
</div>'),
  (null, 'confirmation', 'whatsapp', 'pt', null, 'Olá {{nom_patient}}, sua consulta do dia {{fecha_cita}} às {{hora_cita}} está reservada. Sinal de {{monto_acompte}} {{monnaie}}: {{link_pago}}'),

  (null, 'aviso', 'email', 'pt', 'Lembrete de pagamento — sua consulta será cancelada',
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:20px;color:#b45309;">Falta o seu sinal</h2>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Olá {{nom_patient}}, ainda não recebemos o sinal da sua consulta do dia <strong>{{fecha_cita}} às {{hora_cita}}</strong> com {{nombre_cabinet}}.</p>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">Se não pagar em breve, a consulta será cancelada automaticamente.</p>
  <a href="{{link_pago}}" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px;font-weight:600;">Pagar sinal agora</a>
</div>'),
  (null, 'aviso', 'whatsapp', 'pt', null, 'Olá {{nom_patient}}, falta o sinal da sua consulta do dia {{fecha_cita}}. Evite o cancelamento pagando aqui: {{link_pago}}'),

  (null, 'pago', 'email', 'pt', 'Sinal recebido — consulta confirmada',
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:20px;color:#15803d;">Pagamento recebido!</h2>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Olá {{nom_patient}}, recebemos o seu sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>.</p>
  <p style="margin:0;font-size:15px;line-height:1.5;">Sua consulta do dia <strong>{{fecha_cita}} às {{hora_cita}}</strong> com {{nombre_cabinet}} está confirmada. Te esperamos!</p>
</div>'),
  (null, 'pago', 'whatsapp', 'pt', null, 'Olá {{nom_patient}}, recebemos seu sinal de {{monto_acompte}} {{monnaie}}. Consulta do dia {{fecha_cita}} às {{hora_cita}} confirmada.'),

  (null, 'pago_praticien', 'email', 'pt', '✅ Sinal recebido — {{nom_patient}} em {{fecha_cita}}',
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">Sinal recebido</h2>
  <p style="margin:0;font-size:15px;line-height:1.5;"><strong>{{nom_patient}}</strong> acabou de pagar <strong>{{monto_acompte}} {{monnaie}}</strong> para a consulta do dia {{fecha_cita}} às {{hora_cita}}.</p>
</div>'),

  (null, 'anulacion', 'email', 'pt', 'Consulta cancelada por falta de pagamento',
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:20px;color:#b91c1c;">Consulta cancelada</h2>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Olá {{nom_patient}}, sua consulta do dia <strong>{{fecha_cita}} às {{hora_cita}}</strong> com {{nombre_cabinet}} foi cancelada automaticamente por não recebermos o sinal a tempo.</p>
  <p style="margin:0;font-size:15px;line-height:1.5;">Se quiser reagendar, entre em contato conosco.</p>
</div>'),
  (null, 'anulacion', 'whatsapp', 'pt', null, 'Olá {{nom_patient}}, sua consulta do dia {{fecha_cita}} às {{hora_cita}} foi cancelada por falta de sinal.'),

  (null, 'recordatorio', 'email', 'pt', 'Lembrete de consulta',
'<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937;">
  <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Te esperamos</h2>
  <p style="margin:0;font-size:15px;line-height:1.5;">Olá {{nom_patient}}, lembramos da sua consulta do dia <strong>{{fecha_cita}} às {{hora_cita}}</strong> com {{nombre_cabinet}}.</p>
</div>'),
  (null, 'recordatorio', 'whatsapp', 'pt', null, 'Olá {{nom_patient}}, lembrete: consulta dia {{fecha_cita}} às {{hora_cita}}.')
on conflict (organization_id, type, canal, langue) do update set
  sujet = excluded.sujet,
  corps = excluded.corps;

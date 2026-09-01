-- Enrichit les templates WhatsApp (texte brut, jamais retouches depuis le seed initial) :
-- mise en forme multi-lignes, adresse et detail de cout (memes blocs conditionnels
-- {{#if}} que les emails), lien de paiement isole sur sa propre ligne pour une
-- meilleure detection automatique par WhatsApp.

update message_templates set corps = E'Hola {{nom_patient}}! \U0001F4C5\n\nTu cita con {{nombre_cabinet}} esta reservada:\n{{fecha_cita}} a las {{hora_cita}}\n{{#if direccion}}\U0001F4CD {{direccion}}\n{{/if}}\nPara confirmarla, realiza el acompte de {{monto_acompte}} {{monnaie}}:\n{{#if costo_desglose}}(Costo total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} en el consultorio)\n{{/if}}\n{{link_pago}}'
where organization_id is null and type = 'confirmation' and canal = 'whatsapp' and langue = 'es';

update message_templates set corps = E'\U000023F0 Hola {{nom_patient}}, aun no hemos recibido el acompte para tu cita del {{fecha_cita}} a las {{hora_cita}}.\n\nSi no pagas pronto, la cita sera cancelada automaticamente. Evitalo aqui:\n{{link_pago}}'
where organization_id is null and type = 'aviso' and canal = 'whatsapp' and langue = 'es';

update message_templates set corps = E'\U00002705 Hola {{nom_patient}}, recibimos tu acompte de {{monto_acompte}} {{monnaie}}.\n\nTu cita del {{fecha_cita}} a las {{hora_cita}} con {{nombre_cabinet}} esta confirmada.\n{{#if direccion}}\U0001F4CD {{direccion}}\n{{/if}}{{#if costo_desglose}}Recuerda llevar {{resto_pagar}} {{monnaie}} el dia de tu cita.\n{{/if}}Te esperamos!'
where organization_id is null and type = 'pago' and canal = 'whatsapp' and langue = 'es';

update message_templates set corps = E'\U0000274C Hola {{nom_patient}}, tu cita del {{fecha_cita}} a las {{hora_cita}} fue cancelada por falta de acompte.\n{{#if calendly_url}}\nSi deseas reagendar:\n{{calendly_url}}{{/if}}'
where organization_id is null and type = 'anulacion' and canal = 'whatsapp' and langue = 'es';

update message_templates set corps = E'\U0001F514 Hola {{nom_patient}}, recordatorio de tu cita:\n{{fecha_cita}} a las {{hora_cita}}\n{{#if direccion}}\U0001F4CD {{direccion}}\n{{/if}}{{#if costo_desglose}}No olvides llevar {{resto_pagar}} {{monnaie}}.\n{{/if}}Te esperamos!'
where organization_id is null and type = 'recordatorio' and canal = 'whatsapp' and langue = 'es';

update message_templates set corps = E'Ola {{nom_patient}}! \U0001F4C5\n\nSua consulta com {{nombre_cabinet}} esta reservada:\n{{fecha_cita}} as {{hora_cita}}\n{{#if direccion}}\U0001F4CD {{direccion}}\n{{/if}}\nPara confirmar, realize o sinal de {{monto_acompte}} {{monnaie}}:\n{{#if costo_desglose}}(Valor total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} no consultorio)\n{{/if}}\n{{link_pago}}'
where organization_id is null and type = 'confirmation' and canal = 'whatsapp' and langue = 'pt';

update message_templates set corps = E'\U000023F0 Ola {{nom_patient}}, ainda nao recebemos o sinal da sua consulta do dia {{fecha_cita}} as {{hora_cita}}.\n\nSe nao pagar em breve, a consulta sera cancelada automaticamente. Evite isso aqui:\n{{link_pago}}'
where organization_id is null and type = 'aviso' and canal = 'whatsapp' and langue = 'pt';

update message_templates set corps = E'\U00002705 Ola {{nom_patient}}, recebemos seu sinal de {{monto_acompte}} {{monnaie}}.\n\nSua consulta do dia {{fecha_cita}} as {{hora_cita}} com {{nombre_cabinet}} esta confirmada.\n{{#if direccion}}\U0001F4CD {{direccion}}\n{{/if}}{{#if costo_desglose}}Lembre-se de levar {{resto_pagar}} {{monnaie}} no dia da consulta.\n{{/if}}Te esperamos!'
where organization_id is null and type = 'pago' and canal = 'whatsapp' and langue = 'pt';

update message_templates set corps = E'\U0000274C Ola {{nom_patient}}, sua consulta do dia {{fecha_cita}} as {{hora_cita}} foi cancelada por falta de sinal.\n{{#if calendly_url}}\nSe quiser reagendar:\n{{calendly_url}}{{/if}}'
where organization_id is null and type = 'anulacion' and canal = 'whatsapp' and langue = 'pt';

update message_templates set corps = E'\U0001F514 Ola {{nom_patient}}, lembrete da sua consulta:\n{{fecha_cita}} as {{hora_cita}}\n{{#if direccion}}\U0001F4CD {{direccion}}\n{{/if}}{{#if costo_desglose}}Nao esqueca de levar {{resto_pagar}} {{monnaie}}.\n{{/if}}Te esperamos!'
where organization_id is null and type = 'recordatorio' and canal = 'whatsapp' and langue = 'pt';

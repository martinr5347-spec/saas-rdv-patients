// Catalogue statique des variantes de messages proposées aux praticiens dans
// /dashboard/settings. Ce ne sont pas des templates éditables librement : ce sont
// des modèles prédéfinis (2 par type) que le praticien choisit via un bouton radio.
// Le contenu "standard" reprend exactement les templates par défaut existants
// (message_templates, organization_id null) — "calido" propose un ton plus chaleureux.
//
// Quand un praticien sélectionne une variante, son contenu (avec les variables et
// blocs {{#if}} intacts) est copié dans un override org-spécifique de message_templates
// (voir app/dashboard/settings/page.tsx) — le moteur de rendu ne change pas.

export type NotificationType = 'confirmation' | 'aviso' | 'pago' | 'anulacion' | 'recordatorio' | 'reprogramacion' | 'solicitud_resena'
export type VariantId = 'standard' | 'calido'
export type Canal = 'email' | 'whatsapp'
export type Langue = 'es' | 'pt'

export const VARIANT_IDS: VariantId[] = ['standard', 'calido']

// Ces deux labels s'affichent dans /dashboard/settings et suivent la langue de
// l'interface du praticien (dashboard), pas la langue des messages patients
// (`organization.langue`, utilisée par MESSAGE_VARIANTS/PREVIEWS ci-dessous).
export const VARIANT_LABELS: Record<Langue, Record<VariantId, string>> = {
  es: {
    standard: 'Estándar',
    calido: 'Cercano y cálido',
  },
  pt: {
    standard: 'Padrão',
    calido: 'Próximo e caloroso',
  },
}

// 'solicitud_resena' n'apparait dans aucun des 2 -- NOTIFICATION_TYPES (SettingsView.tsx/actions.ts)
// reste une liste figee a 6 entrees, pas derivee de NotificationType -- ces 2 lignes n'existent
// que pour satisfaire Record<NotificationType, ...> et ne s'affichent nulle part pour l'instant.
export const NOTIFICATION_TYPE_LABELS: Record<Langue, Record<NotificationType, string>> = {
  es: {
    confirmation: 'Confirmación de cita',
    aviso: 'Relance antes de anulación',
    pago: 'Pago recibido',
    anulacion: 'Anulación automática',
    recordatorio: 'Recordatorio de cita (24h)',
    reprogramacion: 'Reprogramación de cita',
    solicitud_resena: 'Solicitud de reseña Google',
  },
  pt: {
    confirmation: 'Confirmação de consulta',
    aviso: 'Aviso antes do cancelamento',
    pago: 'Pagamento recebido',
    anulacion: 'Cancelamento automático',
    recordatorio: 'Lembrete de consulta (24h)',
    reprogramacion: 'Remarcação de consulta',
    solicitud_resena: 'Pedido de avaliação no Google',
  },
}

interface VariantContent {
  sujet?: string
  corps: string
}

function card(color: string, colorDark: string, emoji: string, title: string, body: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background-color:${color};background:linear-gradient(135deg,${color},${colorDark});padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">${emoji}</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">${title}</h1>
  </div>
  <div style="padding:28px 24px;">
${body}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>`
}

function dateBox(horaLabel: string): string {
  return `    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">${horaLabel} {{hora_cita}}</div>
      {{#if direccion}}<div style="font-size:13px;color:#6b7280;margin-top:8px;">📍 {{direccion}}</div>{{/if}}
    </div>`
}

function dateBoxSimple(horaLabel: string): string {
  return `    <div style="background:#f3f4f6;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#111827;">{{fecha_cita}}</div>
      <div style="font-size:14px;color:#4b5563;margin-top:2px;">${horaLabel} {{hora_cita}}</div>
    </div>`
}

type Catalog = Record<NotificationType, Record<VariantId, Record<Canal, Record<Langue, VariantContent>>>>

export const MESSAGE_VARIANTS: Catalog = {
  confirmation: {
    standard: {
      email: {
        es: {
          sujet: 'Confirmación de tu cita',
          corps: card(
            '#2563eb', '#1d4ed8', '📅', 'Tu cita está reservada',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, tu cita con <strong>{{nombre_cabinet}}</strong> está reservada para:</p>
${dateBox('a las')}
    {{#if link_pago}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Para confirmarla, realiza el adelanto de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>{{/if}}
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">Costo total de la consulta: <strong>{{costo_total}} {{monnaie}}</strong> — {{monto_acompte}} {{monnaie}} de adelanto ahora y <strong>{{resto_pagar}} {{monnaie}}</strong> en el consultorio el día de tu cita.</p>{{/if}}
    {{#if link_pago}}<a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar adelanto</a>{{/if}}
    <p style="margin:20px 0 0;text-align:center;"><a href="{{gestion_link}}" style="color:#6b7280;font-size:13px;text-decoration:underline;">Cancelar o reprogramar</a></p>`
          ),
        },
        pt: {
          sujet: 'Confirmação da sua consulta',
          corps: card(
            '#2563eb', '#1d4ed8', '📅', 'Sua consulta está reservada',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Olá {{nom_patient}}, sua consulta com <strong>{{nombre_cabinet}}</strong> está reservada para:</p>
${dateBox('às')}
    {{#if link_pago}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Para confirmar, realize o sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>{{/if}}
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">Valor total da consulta: <strong>{{costo_total}} {{monnaie}}</strong> — {{monto_acompte}} {{monnaie}} de sinal agora e <strong>{{resto_pagar}} {{monnaie}}</strong> no consultório no dia da consulta.</p>{{/if}}
    {{#if link_pago}}<a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar sinal</a>{{/if}}
    <p style="margin:20px 0 0;text-align:center;"><a href="{{gestion_link}}" style="color:#6b7280;font-size:13px;text-decoration:underline;">Cancelar ou remarcar</a></p>`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `📅 Hola {{nom_patient}}!\n\nTu cita con {{nombre_cabinet}} esta reservada:\n{{fecha_cita}} a las {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}\n{{#if link_pago}}Para confirmarla, realiza el adelanto de {{monto_acompte}} {{monnaie}}:\n{{/if}}{{#if costo_desglose}}(Costo total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} en el consultorio)\n{{/if}}{{#if link_pago}}{{link_pago}}{{/if}}`,
        },
        pt: {
          corps: `📅 Ola {{nom_patient}}!\n\nSua consulta com {{nombre_cabinet}} esta reservada:\n{{fecha_cita}} as {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}\n{{#if link_pago}}Para confirmar, realize o sinal de {{monto_acompte}} {{monnaie}}:\n{{/if}}{{#if costo_desglose}}(Valor total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} no consultorio)\n{{/if}}{{#if link_pago}}{{link_pago}}{{/if}}`,
        },
      },
    },
    calido: {
      email: {
        es: {
          sujet: 'Ya tenemos tu cita agendada',
          corps: card(
            '#2563eb', '#1d4ed8', '💙', '¡Qué alegría, {{nom_patient}}!',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Quedó todo listo para tu cita con <strong>{{nombre_cabinet}}</strong>. Este es el detalle:</p>
${dateBox('a las')}
    {{#if link_pago}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Solo falta confirmar tu lugar con un adelanto de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>{{/if}}
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">El costo total es de <strong>{{costo_total}} {{monnaie}}</strong>: dejas {{monto_acompte}} {{monnaie}} ahora y el resto (<strong>{{resto_pagar}} {{monnaie}}</strong>) lo abonas tranquilamente en el consultorio.</p>{{/if}}
    {{#if link_pago}}<a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Confirmar mi cita</a>{{/if}}
    <p style="margin:20px 0 0;text-align:center;"><a href="{{gestion_link}}" style="color:#6b7280;font-size:13px;text-decoration:underline;">Cancelar o reprogramar</a></p>`
          ),
        },
        pt: {
          sujet: 'Sua consulta já está quase pronta',
          corps: card(
            '#2563eb', '#1d4ed8', '💙', 'Que alegria, {{nom_patient}}!',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Ficou tudo certo para sua consulta com <strong>{{nombre_cabinet}}</strong>. Aqui está o resumo:</p>
${dateBox('às')}
    {{#if link_pago}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Só falta confirmar seu horário com um sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>{{/if}}
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">O valor total é de <strong>{{costo_total}} {{monnaie}}</strong>: você deixa {{monto_acompte}} {{monnaie}} agora e paga o restante (<strong>{{resto_pagar}} {{monnaie}}</strong>) tranquilamente no consultório.</p>{{/if}}
    {{#if link_pago}}<a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Confirmar minha consulta</a>{{/if}}
    <p style="margin:20px 0 0;text-align:center;"><a href="{{gestion_link}}" style="color:#6b7280;font-size:13px;text-decoration:underline;">Cancelar ou remarcar</a></p>`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `💙 ¡Qué alegría, {{nom_patient}}!\n\nQuedó todo listo para tu cita con {{nombre_cabinet}}:\n{{fecha_cita}} a las {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}\n{{#if link_pago}}Solo falta confirmar tu lugar con un adelanto de {{monto_acompte}} {{monnaie}}:\n{{/if}}{{#if costo_desglose}}(Costo total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} en el consultorio)\n{{/if}}{{#if link_pago}}{{link_pago}}{{/if}}`,
        },
        pt: {
          corps: `💙 Que alegria, {{nom_patient}}!\n\nFicou tudo certo para sua consulta com {{nombre_cabinet}}:\n{{fecha_cita}} as {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}\n{{#if link_pago}}So falta confirmar seu horario com um sinal de {{monto_acompte}} {{monnaie}}:\n{{/if}}{{#if costo_desglose}}(Valor total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} no consultorio)\n{{/if}}{{#if link_pago}}{{link_pago}}{{/if}}`,
        },
      },
    },
  },

  aviso: {
    standard: {
      email: {
        es: {
          sujet: 'Recordatorio de pago — tu cita será cancelada',
          corps: card(
            '#b45309', '#92400e', '⏰', 'Falta tu adelanto',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, aún no hemos recibido el adelanto para tu cita con <strong>{{nombre_cabinet}}</strong>:</p>
${dateBox('a las')}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Si no pagas pronto, la cita será cancelada automáticamente.</p>
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#b45309;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar adelanto ahora</a>`
          ),
        },
        pt: {
          sujet: 'Lembrete de pagamento — sua consulta será cancelada',
          corps: card(
            '#b45309', '#92400e', '⏰', 'Falta o seu sinal',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Olá {{nom_patient}}, ainda não recebemos o sinal da sua consulta com <strong>{{nombre_cabinet}}</strong>:</p>
${dateBox('às')}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Se não pagar em breve, a consulta será cancelada automaticamente.</p>
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#b45309;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar sinal agora</a>`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `⏰ Hola {{nom_patient}}, aun no hemos recibido el adelanto para tu cita del {{fecha_cita}} a las {{hora_cita}}.\n\nSi no pagas pronto, la cita sera cancelada automaticamente. Evitalo aqui:\n{{link_pago}}`,
        },
        pt: {
          corps: `⏰ Ola {{nom_patient}}, ainda nao recebemos o sinal da sua consulta do dia {{fecha_cita}} as {{hora_cita}}.\n\nSe nao pagar em breve, a consulta sera cancelada automaticamente. Evite isso aqui:\n{{link_pago}}`,
        },
      },
    },
    calido: {
      email: {
        es: {
          sujet: 'No te olvides de tu adelanto',
          corps: card(
            '#b45309', '#92400e', '🙂', 'Un empujoncito más, {{nom_patient}}',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Vimos que todavía no llega el adelanto para tu cita con <strong>{{nombre_cabinet}}</strong>. ¡No pasa nada, todavía estás a tiempo!</p>
${dateBox('a las')}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Si prefieres mantener tu horario, complétalo aquí antes de que se libere:</p>
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#b45309;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Completar mi adelanto</a>`
          ),
        },
        pt: {
          sujet: 'Não esqueça do seu sinal',
          corps: card(
            '#b45309', '#92400e', '🙂', 'Só falta um passinho, {{nom_patient}}',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Vimos que o sinal da sua consulta com <strong>{{nombre_cabinet}}</strong> ainda não chegou. Não se preocupe, ainda dá tempo!</p>
${dateBox('às')}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Para manter seu horário, é só concluir por aqui antes que ele seja liberado:</p>
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#b45309;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Concluir meu sinal</a>`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `🙂 Hola {{nom_patient}}, un empujoncito mas: todavia no llega el adelanto de tu cita del {{fecha_cita}} a las {{hora_cita}}.\n\nSi prefieres mantener tu horario, completalo aqui antes de que se libere:\n{{link_pago}}`,
        },
        pt: {
          corps: `🙂 Ola {{nom_patient}}, so falta um passinho: o sinal da sua consulta do dia {{fecha_cita}} as {{hora_cita}} ainda nao chegou.\n\nPara manter seu horario, conclua por aqui antes que ele seja liberado:\n{{link_pago}}`,
        },
      },
    },
  },

  pago: {
    standard: {
      email: {
        es: {
          sujet: 'Acompte recibido — cita confirmada',
          corps: card(
            '#15803d', '#166534', '✅', '¡Pago recibido!',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, hemos recibido tu adelanto de <strong>{{monto_acompte}} {{monnaie}}</strong>.</p>
${dateBox('a las')}
    {{#if costo_desglose}}<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280;">Recuerda llevar <strong>{{resto_pagar}} {{monnaie}}</strong> el día de tu cita (costo total: {{costo_total}} {{monnaie}}).</p>{{/if}}
    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">Tu cita con <strong>{{nombre_cabinet}}</strong> está confirmada. ¡Te esperamos!</p>`
          ),
        },
        pt: {
          sujet: 'Sinal recebido — consulta confirmada',
          corps: card(
            '#15803d', '#166534', '✅', 'Pagamento recebido!',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Olá {{nom_patient}}, recebemos o seu sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>.</p>
${dateBox('às')}
    {{#if costo_desglose}}<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280;">Lembre-se de levar <strong>{{resto_pagar}} {{monnaie}}</strong> no dia da consulta (valor total: {{costo_total}} {{monnaie}}).</p>{{/if}}
    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">Sua consulta com <strong>{{nombre_cabinet}}</strong> está confirmada. Te esperamos!</p>`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `✅ Hola {{nom_patient}}, recibimos tu adelanto de {{monto_acompte}} {{monnaie}}.\n\nTu cita del {{fecha_cita}} a las {{hora_cita}} con {{nombre_cabinet}} esta confirmada.\n{{#if direccion}}📍 {{direccion}}\n{{/if}}{{#if costo_desglose}}Recuerda llevar {{resto_pagar}} {{monnaie}} el dia de tu cita.\n{{/if}}Te esperamos!`,
        },
        pt: {
          corps: `✅ Ola {{nom_patient}}, recebemos seu sinal de {{monto_acompte}} {{monnaie}}.\n\nSua consulta do dia {{fecha_cita}} as {{hora_cita}} com {{nombre_cabinet}} esta confirmada.\n{{#if direccion}}📍 {{direccion}}\n{{/if}}{{#if costo_desglose}}Lembre-se de levar {{resto_pagar}} {{monnaie}} no dia da consulta.\n{{/if}}Te esperamos!`,
        },
      },
    },
    calido: {
      email: {
        es: {
          sujet: '¡Gracias por tu pago!',
          corps: card(
            '#15803d', '#166534', '💚', '¡Todo listo, {{nom_patient}}!',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Recibimos tu adelanto de <strong>{{monto_acompte}} {{monnaie}}</strong>, ¡muchas gracias!</p>
${dateBox('a las')}
    {{#if costo_desglose}}<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280;">Recuerda traer <strong>{{resto_pagar}} {{monnaie}}</strong> el día de tu cita (costo total: {{costo_total}} {{monnaie}}).</p>{{/if}}
    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">Tu cita con <strong>{{nombre_cabinet}}</strong> está confirmada. ¡Nos vemos pronto!</p>`
          ),
        },
        pt: {
          sujet: 'Obrigado pelo seu pagamento!',
          corps: card(
            '#15803d', '#166534', '💚', 'Tudo certo, {{nom_patient}}!',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Recebemos o seu sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>, muito obrigado!</p>
${dateBox('às')}
    {{#if costo_desglose}}<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280;">Lembre-se de trazer <strong>{{resto_pagar}} {{monnaie}}</strong> no dia da consulta (valor total: {{costo_total}} {{monnaie}}).</p>{{/if}}
    <p style="margin:0;font-size:15px;line-height:1.6;color:#1f2937;">Sua consulta com <strong>{{nombre_cabinet}}</strong> está confirmada. Até breve!</p>`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `💚 ¡Gracias, {{nom_patient}}! Recibimos tu adelanto de {{monto_acompte}} {{monnaie}}.\n\nTu cita del {{fecha_cita}} a las {{hora_cita}} con {{nombre_cabinet}} esta confirmada.\n{{#if direccion}}📍 {{direccion}}\n{{/if}}{{#if costo_desglose}}Recuerda traer {{resto_pagar}} {{monnaie}} el dia de tu cita.\n{{/if}}Nos vemos pronto!`,
        },
        pt: {
          corps: `💚 Obrigado, {{nom_patient}}! Recebemos seu sinal de {{monto_acompte}} {{monnaie}}.\n\nSua consulta do dia {{fecha_cita}} as {{hora_cita}} com {{nombre_cabinet}} esta confirmada.\n{{#if direccion}}📍 {{direccion}}\n{{/if}}{{#if costo_desglose}}Lembre-se de trazer {{resto_pagar}} {{monnaie}} no dia da consulta.\n{{/if}}Ate breve!`,
        },
      },
    },
  },

  anulacion: {
    standard: {
      email: {
        es: {
          sujet: 'Cita cancelada por falta de pago',
          corps: card(
            '#b91c1c', '#991b1b', '❌', 'Cita cancelada',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, tu cita con <strong>{{nombre_cabinet}}</strong> ha sido cancelada automáticamente por no recibir el adelanto a tiempo:</p>
${dateBoxSimple('a las')}
    {{#if reserva_url}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Si deseas reagendar, hazlo aquí mismo:</p>
    <a href="{{reserva_url}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Reagendar cita</a>{{/if}}`
          ),
        },
        pt: {
          sujet: 'Consulta cancelada por falta de pagamento',
          corps: card(
            '#b91c1c', '#991b1b', '❌', 'Consulta cancelada',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Olá {{nom_patient}}, sua consulta com <strong>{{nombre_cabinet}}</strong> foi cancelada automaticamente por não recebermos o sinal a tempo:</p>
${dateBoxSimple('às')}
    {{#if reserva_url}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Se quiser reagendar, faça aqui mesmo:</p>
    <a href="{{reserva_url}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Reagendar consulta</a>{{/if}}`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `❌ Hola {{nom_patient}}, tu cita del {{fecha_cita}} a las {{hora_cita}} fue cancelada por falta de adelanto.\n{{#if reserva_url}}\nSi deseas reagendar:\n{{reserva_url}}{{/if}}`,
        },
        pt: {
          corps: `❌ Ola {{nom_patient}}, sua consulta do dia {{fecha_cita}} as {{hora_cita}} foi cancelada por falta de sinal.\n{{#if reserva_url}}\nSe quiser reagendar:\n{{reserva_url}}{{/if}}`,
        },
      },
    },
    calido: {
      email: {
        es: {
          sujet: 'Tu horario quedó liberado',
          corps: card(
            '#b91c1c', '#991b1b', '🙁', 'No hay problema, {{nom_patient}}',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Como no llegamos a recibir el adelanto a tiempo, tu horario con <strong>{{nombre_cabinet}}</strong> quedó liberado:</p>
${dateBoxSimple('a las')}
    {{#if reserva_url}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Cuando quieras, puedes elegir un nuevo horario aquí:</p>
    <a href="{{reserva_url}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Elegir nuevo horario</a>{{/if}}`
          ),
        },
        pt: {
          sujet: 'Seu horário foi liberado',
          corps: card(
            '#b91c1c', '#991b1b', '🙁', 'Sem problemas, {{nom_patient}}',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Como não recebemos o sinal a tempo, seu horário com <strong>{{nombre_cabinet}}</strong> foi liberado:</p>
${dateBoxSimple('às')}
    {{#if reserva_url}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Quando quiser, você pode escolher um novo horário aqui:</p>
    <a href="{{reserva_url}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Escolher novo horário</a>{{/if}}`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `🙁 Hola {{nom_patient}}, no hay problema: tu horario del {{fecha_cita}} a las {{hora_cita}} quedo liberado por no llegar el adelanto a tiempo.\n{{#if reserva_url}}\nCuando quieras, elige un nuevo horario aqui:\n{{reserva_url}}{{/if}}`,
        },
        pt: {
          corps: `🙁 Ola {{nom_patient}}, sem problemas: seu horario do dia {{fecha_cita}} as {{hora_cita}} foi liberado por nao recebermos o sinal a tempo.\n{{#if reserva_url}}\nQuando quiser, escolha um novo horario aqui:\n{{reserva_url}}{{/if}}`,
        },
      },
    },
  },

  recordatorio: {
    standard: {
      email: {
        es: {
          sujet: 'Recordatorio de cita',
          corps: card(
            '#0891b2', '#0e7490', '🔔', 'Te esperamos',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, te recordamos tu cita con <strong>{{nombre_cabinet}}</strong>:</p>
${dateBox('a las')}
    {{#if costo_desglose}}<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">No olvides llevar <strong>{{resto_pagar}} {{monnaie}}</strong> el día de tu cita.</p>{{/if}}`
          ),
        },
        pt: {
          sujet: 'Lembrete de consulta',
          corps: card(
            '#0891b2', '#0e7490', '🔔', 'Te esperamos',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Olá {{nom_patient}}, lembramos da sua consulta com <strong>{{nombre_cabinet}}</strong>:</p>
${dateBox('às')}
    {{#if costo_desglose}}<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">Não esqueça de levar <strong>{{resto_pagar}} {{monnaie}}</strong> no dia da consulta.</p>{{/if}}`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `🔔 Hola {{nom_patient}}, recordatorio de tu cita:\n{{fecha_cita}} a las {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}{{#if costo_desglose}}No olvides llevar {{resto_pagar}} {{monnaie}}.\n{{/if}}Te esperamos!`,
        },
        pt: {
          corps: `🔔 Ola {{nom_patient}}, lembrete da sua consulta:\n{{fecha_cita}} as {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}{{#if costo_desglose}}Nao esqueca de levar {{resto_pagar}} {{monnaie}}.\n{{/if}}Te esperamos!`,
        },
      },
    },
    calido: {
      email: {
        es: {
          sujet: '¡Nos vemos prontito!',
          corps: card(
            '#0891b2', '#0e7490', '😊', '¡Te esperamos, {{nom_patient}}!',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Solo un recordatorio cariñoso de tu cita con <strong>{{nombre_cabinet}}</strong>:</p>
${dateBox('a las')}
    {{#if costo_desglose}}<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">No olvides traer <strong>{{resto_pagar}} {{monnaie}}</strong>.</p>{{/if}}`
          ),
        },
        pt: {
          sujet: 'Até já!',
          corps: card(
            '#0891b2', '#0e7490', '😊', 'Estamos te esperando, {{nom_patient}}!',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Só um lembrete carinhoso da sua consulta com <strong>{{nombre_cabinet}}</strong>:</p>
${dateBox('às')}
    {{#if costo_desglose}}<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">Não esqueça de trazer <strong>{{resto_pagar}} {{monnaie}}</strong>.</p>{{/if}}`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `😊 Hola {{nom_patient}}, un recordatorio carinoso de tu cita:\n{{fecha_cita}} a las {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}{{#if costo_desglose}}No olvides traer {{resto_pagar}} {{monnaie}}.\n{{/if}}Te esperamos!`,
        },
        pt: {
          corps: `😊 Ola {{nom_patient}}, um lembrete carinhoso da sua consulta:\n{{fecha_cita}} as {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}{{#if costo_desglose}}Nao esqueca de trazer {{resto_pagar}} {{monnaie}}.\n{{/if}}Te esperamos!`,
        },
      },
    },
  },

  // Format plus simple (pas card()) que les 5 types ci-dessus -- le "standard" reprend ici
  // exactement les templates par defaut seedes par la migration 034 (message_templates,
  // organization_id null), qui n'utilisent pas l'enveloppe card() a gradient. "calido" garde la
  // meme structure simple pour rester coherent avec "standard" (pas de saut visuel brusque).
  reprogramacion: {
    standard: {
      email: {
        es: {
          sujet: 'Tu cita fue reprogramada',
          corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Tu cita fue reprogramada</h2><p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Hola {{nom_patient}}, tu cita con <strong>{{nombre_cabinet}}</strong> fue movida a:</p><p style="margin:0 0 20px;font-size:15px;line-height:1.5;"><strong>{{fecha_cita}}</strong> a las <strong>{{hora_cita}}</strong></p></div>`,
        },
        pt: {
          sujet: 'Sua consulta foi remarcada',
          corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Sua consulta foi remarcada</h2><p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Olá {{nom_patient}}, sua consulta com <strong>{{nombre_cabinet}}</strong> foi movida para:</p><p style="margin:0 0 20px;font-size:15px;line-height:1.5;"><strong>{{fecha_cita}}</strong> às <strong>{{hora_cita}}</strong></p></div>`,
        },
      },
      whatsapp: {
        es: {
          corps: `🔄 Hola {{nom_patient}}! Tu cita con {{nombre_cabinet}} fue reprogramada:\n{{fecha_cita}} a las {{hora_cita}}`,
        },
        pt: {
          corps: `🔄 Olá {{nom_patient}}! Sua consulta com {{nombre_cabinet}} foi remarcada:\n{{fecha_cita}} às {{hora_cita}}`,
        },
      },
    },
    calido: {
      email: {
        es: {
          sujet: '¡Listo, tu cita quedó reprogramada!',
          corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><h2 style="margin:0 0 16px;font-size:20px;color:#111827;">¡Todo listo, {{nom_patient}}! 😊</h2><p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Tu cita con <strong>{{nombre_cabinet}}</strong> quedó reprogramada para:</p><p style="margin:0 0 20px;font-size:15px;line-height:1.5;"><strong>{{fecha_cita}}</strong> a las <strong>{{hora_cita}}</strong></p><p style="margin:0;font-size:14px;line-height:1.5;color:#4b5563;">¡Nos vemos pronto!</p></div>`,
        },
        pt: {
          sujet: 'Prontinho, sua consulta foi remarcada!',
          corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Tudo certo, {{nom_patient}}! 😊</h2><p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Sua consulta com <strong>{{nombre_cabinet}}</strong> foi remarcada para:</p><p style="margin:0 0 20px;font-size:15px;line-height:1.5;"><strong>{{fecha_cita}}</strong> às <strong>{{hora_cita}}</strong></p><p style="margin:0;font-size:14px;line-height:1.5;color:#4b5563;">Até breve!</p></div>`,
        },
      },
      whatsapp: {
        es: {
          corps: `😊 ¡Listo, {{nom_patient}}! Tu cita con {{nombre_cabinet}} quedó reprogramada:\n{{fecha_cita}} a las {{hora_cita}}\n\n¡Nos vemos pronto!`,
        },
        pt: {
          corps: `😊 Prontinho, {{nom_patient}}! Sua consulta com {{nombre_cabinet}} foi remarcada:\n{{fecha_cita}} às {{hora_cita}}\n\nAté breve!`,
        },
      },
    },
  },

  // Contenu patient (es/pt) fourni mot pour mot par le prompt d'origine, a la premiere personne du
  // singulier ("yo", jamais "nosotros") -- PT redige dans le meme esprit, pas une traduction litterale.
  // Pas de card() a bandeau degrade (aucune maquette visuelle n'etait fournie) -- format simple comme
  // 'reprogramacion' ci-dessus. {{praticien}} et {{google_review_link}} sont calcules par
  // buildTemplateValues() (lib/dispatcher/index.ts).
  solicitud_resena: {
    standard: {
      email: {
        es: {
          sujet: '¿Cómo fue tu experiencia?',
          corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, gracias por confiar en mí para tu última consulta.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Si te sientes cómodo compartiendo tu experiencia, puedes dejar una reseña aquí:</p><a href="{{google_review_link}}" style="display:block;text-align:center;background:#ca8a04;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Dejar mi reseña</a><p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#4b5563;">Tu opinión me ayuda mucho.<br>Saludos,<br>{{praticien}}</p></div>`,
        },
        pt: {
          sujet: 'Como foi sua experiência?',
          corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;">Olá {{nom_patient}}, obrigado por confiar em mim para sua última consulta.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Se você se sentir confortável em compartilhar sua experiência, pode deixar uma avaliação aqui:</p><a href="{{google_review_link}}" style="display:block;text-align:center;background:#ca8a04;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Deixar minha avaliação</a><p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#4b5563;">Sua opinião me ajuda muito.<br>Um abraço,<br>{{praticien}}</p></div>`,
        },
      },
      whatsapp: {
        es: {
          corps: `⭐ Hola {{nom_patient}} 👋\n\nEspero que te sientas muy bien después de tu consulta. Si tienes un minuto, me ayudaría mucho que dejes tu opinión aquí:\n{{google_review_link}}\n\n¡Gracias!`,
        },
        pt: {
          corps: `⭐ Olá {{nom_patient}} 👋\n\nEspero que você esteja se sentindo muito bem depois da sua consulta. Se tiver um minuto, me ajudaria muito que você deixasse sua opinião aqui:\n{{google_review_link}}\n\nObrigado!`,
        },
      },
    },
    calido: {
      email: {
        es: {
          sujet: 'Tu opinión significa mucho para mí',
          corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><h2 style="margin:0 0 16px;font-size:19px;color:#111827;">⭐ Hola {{nom_patient}}</h2><p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;">Espero que te sientas muy bien después de tu última visita conmigo.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Si tienes un minuto, me encantaría que compartas tu experiencia en Google — cada reseña me ayuda a seguir mejorando:</p><a href="{{google_review_link}}" style="display:block;text-align:center;background:#ca8a04;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Compartir mi experiencia</a><p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#4b5563;">Gracias de corazón,<br>{{praticien}}</p></div>`,
        },
        pt: {
          sujet: 'Sua opinião significa muito para mim',
          corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;"><h2 style="margin:0 0 16px;font-size:19px;color:#111827;">⭐ Olá {{nom_patient}}</h2><p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;">Espero que você esteja se sentindo muito bem depois da sua última visita comigo.</p><p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Se tiver um minuto, eu adoraria que você compartilhasse sua experiência no Google — cada avaliação me ajuda a continuar melhorando:</p><a href="{{google_review_link}}" style="display:block;text-align:center;background:#ca8a04;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Compartilhar minha experiência</a><p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#4b5563;">Obrigado de coração,<br>{{praticien}}</p></div>`,
        },
      },
      whatsapp: {
        es: {
          corps: `💛 Hola {{nom_patient}}, ¿cómo te sientes después de tu última visita?\n\nSi todo fue bien, me encantaría que compartas tu experiencia en Google, me ayuda muchísimo a seguir mejorando:\n{{google_review_link}}\n\nUn abrazo, {{praticien}}.`,
        },
        pt: {
          corps: `💛 Olá {{nom_patient}}, como você está se sentindo depois da sua última visita?\n\nSe tudo correu bem, eu adoraria que você compartilhasse sua experiência no Google, isso me ajuda muito a continuar melhorando:\n{{google_review_link}}\n\nUm abraço, {{praticien}}.`,
        },
      },
    },
  },
}

export function getVariantContent(type: NotificationType, variant: VariantId, canal: Canal, langue: Langue): VariantContent {
  return MESSAGE_VARIANTS[type][variant][canal][langue]
}

// Aperçus courts (2-3 lignes, données d'exemple) affichés sous chaque bouton radio
// dans /dashboard/settings. Texte indépendant du vrai corps (HTML/plain-text) des
// templates — juste pour donner une idée du ton, pas un rendu fidèle pixel-perfect.
const PREVIEWS: Record<NotificationType, Record<VariantId, Record<Langue, string>>> = {
  confirmation: {
    standard: {
      es: 'Tu cita está reservada\nHola [Nombre], tu cita con [Clínica] está reservada para [Fecha] a las [Hora].\nPara confirmarla, realiza el adelanto de [Valor] PEN.',
      pt: 'Olá [Nome], sua consulta com [Clínica] está agendada para [Data] às [Hora]. Para confirmá-la, realize o sinal de [Valor] PEN.',
    },
    calido: {
      es: '¡Qué alegría, [Nombre]!\nQuedó todo listo para tu cita con [Clínica]. Este es el detalle: [Fecha] a las [Hora].\nSolo falta confirmar tu lugar con un adelanto de [Valor] PEN.',
      pt: 'Que alegria, [Nome]! Tudo pronto para sua consulta com [Clínica]. Detalhe: [Data] às [Hora]. Só falta confirmar seu lugar com um sinal de [Valor] PEN.',
    },
  },
  aviso: {
    standard: {
      es: 'Falta tu adelanto\nHola [Nombre], aún no hemos recibido el adelanto para tu cita con [Clínica].\nSi no pagas pronto, la cita será cancelada automáticamente.',
      pt: 'Falta seu sinal. Olá [Nome], ainda não recebemos o sinal para sua consulta com [Clínica]. Se não pagar em breve, a consulta será cancelada automaticamente.',
    },
    calido: {
      es: 'Un empujoncito más, [Nombre]\nVimos que todavía no llega el adelanto para tu cita con [Clínica]. ¡No pasa nada, todavía estás a tiempo!\nSi prefieres mantener tu horario, complétalo aquí antes de que se libere.',
      pt: 'Um empurrãozinho, [Nome]! Vimos que o sinal para sua consulta com [Clínica] ainda não chegou. Sem problema, você ainda está a tempo! Se quiser manter seu horário, complete aqui antes que seja liberado.',
    },
  },
  pago: {
    standard: {
      es: '¡Pago recibido!\nHola [Nombre], hemos recibido tu adelanto de [Valor] PEN.\nTu cita con [Clínica] está confirmada. ¡Te esperamos!',
      pt: 'Pagamento recebido! Olá [Nome], recebemos seu sinal de [Valor] PEN. Sua consulta com [Clínica] está confirmada. Te esperamos!',
    },
    calido: {
      es: '¡Todo listo, [Nombre]!\nRecibimos tu adelanto de [Valor] PEN, ¡muchas gracias!\nTu cita con [Clínica] está confirmada. ¡Nos vemos pronto!',
      pt: 'Tudo certo, [Nome]! Recebemos seu sinal de [Valor] PEN, obrigado! Sua consulta com [Clínica] está confirmada. Até logo!',
    },
  },
  anulacion: {
    standard: {
      es: 'Cita cancelada\nHola [Nombre], tu cita con [Clínica] ha sido cancelada automáticamente por no recibir el adelanto a tiempo.\nSi deseas reagendar, hazlo aquí mismo.',
      pt: 'Consulta cancelada. Olá [Nome], sua consulta com [Clínica] foi cancelada automaticamente por não receber o sinal a tempo. Se quiser reagendar, faça aqui mesmo.',
    },
    calido: {
      es: 'No hay problema, [Nombre]\nComo no llegamos a recibir el adelanto a tiempo, tu horario con [Clínica] quedó liberado.\nCuando quieras, puedes elegir un nuevo horario aquí.',
      pt: 'Sem problema, [Nome]! Como não recebemos o sinal a tempo, seu horário com [Clínica] foi liberado. Quando quiser, você pode escolher um novo horário aqui.',
    },
  },
  recordatorio: {
    standard: {
      es: 'Te esperamos\nHola [Nombre], te recordamos tu cita con [Clínica]: [Fecha] a las [Hora].',
      pt: 'Te esperamos! Olá [Nome], lembramos sua consulta com [Clínica]: [Data] às [Hora].',
    },
    calido: {
      es: '¡Te esperamos, [Nombre]!\nSolo un recordatorio cariñoso de tu cita con [Clínica]: [Fecha] a las [Hora].',
      pt: 'Te esperamos, [Nome]! Só um lembrete carinhoso da sua consulta com [Clínica]: [Data] às [Hora].',
    },
  },
  reprogramacion: {
    standard: {
      es: 'Tu cita fue reprogramada\nHola [Nombre], tu cita con [Clínica] fue movida a: [Fecha] a las [Hora].',
      pt: 'Sua consulta foi remarcada. Olá [Nome], sua consulta com [Clínica] foi movida para: [Data] às [Hora].',
    },
    calido: {
      es: '¡Todo listo, [Nombre]! 😊\nTu cita con [Clínica] quedó reprogramada para: [Fecha] a las [Hora]. ¡Nos vemos pronto!',
      pt: 'Tudo certo, [Nome]! 😊 Sua consulta com [Clínica] foi remarcada para: [Data] às [Hora]. Até breve!',
    },
  },
  solicitud_resena: {
    standard: {
      es: 'Hola [Nombre] 👋\nEspero que te sientas muy bien después de tu consulta. Si tienes un minuto, me ayudaría mucho que dejes tu opinión aquí: [Link]. ¡Gracias!',
      pt: 'Olá [Nome] 👋\nEspero que você esteja se sentindo bem depois da consulta. Se tiver um minuto, deixe sua opinião aqui: [Link]. Obrigado!',
    },
    calido: {
      es: '¿Cómo te sientes, [Nombre]?\nSi todo fue bien, me encantaría que compartas tu experiencia en Google: [Link]. Un abrazo, [Praticien].',
      pt: 'Como você está, [Nome]?\nSe tudo correu bem, compartilhe sua experiência no Google: [Link]. Um abraço, [Praticien].',
    },
  },
}

export function getPreview(type: NotificationType, variant: VariantId, langue: Langue): string {
  return PREVIEWS[type][variant][langue]
}

// "control_recall" reste hors de NotificationType/Catalog volontairement (son propre catalogue,
// sa propre colonne org_settings.variante_control_recall plutot que variantes_mensaje) mais a
// desormais, comme Catalog, une dimension Canal (email/whatsapp) : le rappel de controle respecte
// canal_email/canal_whatsapp au meme titre que les 7 autres types (lib/cron/patient-recall.ts).
export const CONTROL_RECALL_LABEL: Record<Langue, string> = {
  es: 'Recordatorio de control',
  pt: 'Lembrete de retorno',
}

export const CONTROL_RECALL_VARIANTS: Record<VariantId, Record<Canal, Record<Langue, VariantContent>>> = {
  standard: {
    email: {
      es: {
        sujet: 'Es momento de tu control',
        corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:linear-gradient(135deg,#6926D2,#4c1d95);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#128197;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Es momento de tu control</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, ha llegado el momento de programar tu consulta de control con <strong>{{nombre_cabinet}}</strong>.</p>
    {{#if reserva_url}}<a href="{{reserva_url}}" style="display:block;text-align:center;background:#6926D2;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Reservar mi cita</a>{{/if}}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>`,
      },
      pt: {
        sujet: 'É hora do seu retorno',
        corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:linear-gradient(135deg,#6926D2,#4c1d95);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#128197;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">É hora do seu retorno</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Olá {{nom_patient}}, chegou a hora de agendar sua consulta de retorno com <strong>{{nombre_cabinet}}</strong>.</p>
    {{#if reserva_url}}<a href="{{reserva_url}}" style="display:block;text-align:center;background:#6926D2;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Agendar minha consulta</a>{{/if}}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>`,
      },
    },
    // Meme message que l'email ci-dessus, mot pour mot (titre + paragraphe + texte du bouton),
    // juste converti en texte brut (balises retirees, lien en clair) -- aucun nouveau texte invente.
    whatsapp: {
      es: {
        corps: `📅 Es momento de tu control\n\nHola {{nom_patient}}, ha llegado el momento de programar tu consulta de control con {{nombre_cabinet}}.\n{{#if reserva_url}}\nReservar mi cita:\n{{reserva_url}}{{/if}}`,
      },
      pt: {
        corps: `📅 É hora do seu retorno\n\nOlá {{nom_patient}}, chegou a hora de agendar sua consulta de retorno com {{nombre_cabinet}}.\n{{#if reserva_url}}\nAgendar minha consulta:\n{{reserva_url}}{{/if}}`,
      },
    },
  },
  // Même écart de ton que les variantes "cálido" des 5 types existants ci-dessus (emoji discret,
  // formule plus personnelle). Contenu rédigé directement ici -- non issu d'un brouillon externe.
  calido: {
    email: {
      es: {
        sujet: '¡Hora de tu controlcito! 😊',
        corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:linear-gradient(135deg,#6926D2,#4c1d95);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#128204;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">¡Hola {{nom_patient}}! 😊</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Ha llegado el momento de tu control con <strong>{{nombre_cabinet}}</strong>. ¡Nos encantaría verte de nuevo!</p>
    {{#if reserva_url}}<a href="{{reserva_url}}" style="display:block;text-align:center;background:#6926D2;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Reservar mi cita</a>{{/if}}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>`,
      },
      pt: {
        sujet: 'Hora do seu retornozinho! 😊',
        corps: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:linear-gradient(135deg,#6926D2,#4c1d95);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#128204;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Olá {{nom_patient}}! 😊</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Chegou a hora do seu retorno com <strong>{{nombre_cabinet}}</strong>. Ficaríamos muito felizes em te ver de novo!</p>
    {{#if reserva_url}}<a href="{{reserva_url}}" style="display:block;text-align:center;background:#6926D2;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Agendar minha consulta</a>{{/if}}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>`,
      },
    },
    whatsapp: {
      es: {
        corps: `📌 ¡Hola {{nom_patient}}! 😊\n\nHa llegado el momento de tu control con {{nombre_cabinet}}. ¡Nos encantaría verte de nuevo!\n{{#if reserva_url}}\nReservar mi cita:\n{{reserva_url}}{{/if}}`,
      },
      pt: {
        corps: `📌 Olá {{nom_patient}}! 😊\n\nChegou a hora do seu retorno com {{nombre_cabinet}}. Ficaríamos muito felizes em te ver de novo!\n{{#if reserva_url}}\nAgendar minha consulta:\n{{reserva_url}}{{/if}}`,
      },
    },
  },
}

export function getControlRecallVariantContent(variant: VariantId, canal: Canal, langue: Langue): VariantContent {
  return CONTROL_RECALL_VARIANTS[variant][canal][langue]
}

const CONTROL_RECALL_PREVIEWS: Record<VariantId, Record<Langue, string>> = {
  standard: {
    es: 'Es momento de tu control\nHola [Nombre], ha llegado el momento de programar tu consulta de control con [Clínica].',
    pt: 'É hora do seu retorno. Olá [Nome], chegou a hora de agendar sua consulta de retorno com [Clínica].',
  },
  calido: {
    es: '¡Hora de tu controlcito! 😊\n¡Hola [Nombre]! Ha llegado el momento de tu control con [Clínica]. ¡Nos encantaría verte de nuevo!',
    pt: 'Hora do seu retornozinho! 😊 Olá [Nome]! Chegou a hora do seu retorno com [Clínica]. Ficaríamos muito felizes em te ver de novo!',
  },
}

export function getControlRecallPreview(variant: VariantId, langue: Langue): string {
  return CONTROL_RECALL_PREVIEWS[variant][langue]
}

// SID des templates WhatsApp Meta pre-approuves (Content API Twilio), par type/variante/langue --
// toutes a null par defaut. Ce n'est pas a Devin de decider du texte des templates ni d'inventer
// un SID : Martin les renseigne manuellement ici une fois chaque template soumis et approuve par
// Meta via la Console Twilio. Catalogue separe de MESSAGE_VARIANTS (pas de dimension Canal : ces
// SID ne concernent que whatsapp) pour ne pas toucher la structure existante utilisee par email et
// par Unipile.
type TwilioContentSidCatalog = Record<NotificationType, Record<VariantId, Record<Langue, string | null>>>

function nullPerLangue(): Record<Langue, string | null> {
  return { es: null, pt: null }
}

export const TWILIO_CONTENT_SIDS: TwilioContentSidCatalog = {
  confirmation: { standard: nullPerLangue(), calido: nullPerLangue() },
  aviso: { standard: nullPerLangue(), calido: nullPerLangue() },
  pago: { standard: nullPerLangue(), calido: nullPerLangue() },
  anulacion: { standard: nullPerLangue(), calido: nullPerLangue() },
  recordatorio: { standard: nullPerLangue(), calido: nullPerLangue() },
  reprogramacion: { standard: nullPerLangue(), calido: nullPerLangue() },
  solicitud_resena: { standard: nullPerLangue(), calido: nullPerLangue() },
}

export function getTwilioContentSid(type: NotificationType, variant: VariantId, langue: Langue): string | null {
  return TWILIO_CONTENT_SIDS[type][variant][langue]
}

// Meme principe que TWILIO_CONTENT_SIDS ci-dessus, catalogue separe car control_recall n'est pas
// un NotificationType -- toutes les valeurs a null par defaut, Martin les renseigne manuellement
// une fois le template Meta soumis et approuve via la Console Twilio.
export const CONTROL_RECALL_TWILIO_CONTENT_SIDS: Record<VariantId, Record<Langue, string | null>> = {
  standard: nullPerLangue(),
  calido: nullPerLangue(),
}

export function getControlRecallTwilioContentSid(variant: VariantId, langue: Langue): string | null {
  return CONTROL_RECALL_TWILIO_CONTENT_SIDS[variant][langue]
}

// Les templates Twilio/Meta crees par Martin dans la Console utilisent la syntaxe a variables
// numerotees ({{1}}, {{2}}, ...), pas les noms de variables internes de l'application -- Twilio
// attend contentVariables sous la forme {"1": "...", "2": "...", ...}. Cet ordre est l'exact ordre
// saisi dans la Console pour chacun des templates deja crees (source de verite externe, non
// deductible du code) : ne pas le modifier sans avoir aussi modifie le template cote Twilio.
export const TWILIO_VARIABLE_ORDER: Record<NotificationType, Record<VariantId, string[]>> = {
  confirmation: {
    standard: ['nom_patient', 'nombre_cabinet', 'fecha_cita', 'hora_cita', 'direccion', 'monto_con_moneda', 'link_pago'],
    calido: ['nom_patient', 'nombre_cabinet', 'fecha_cita', 'hora_cita', 'direccion', 'monto_con_moneda', 'link_pago'],
  },
  pago: {
    standard: ['nom_patient', 'monto_con_moneda', 'fecha_cita', 'hora_cita', 'nombre_cabinet', 'direccion'],
    calido: ['nom_patient', 'monto_con_moneda', 'fecha_cita', 'hora_cita', 'nombre_cabinet', 'direccion'],
  },
  recordatorio: {
    standard: ['nom_patient', 'fecha_cita', 'hora_cita', 'direccion'],
    calido: ['nom_patient', 'fecha_cita', 'hora_cita', 'direccion'],
  },
  aviso: {
    standard: ['nom_patient', 'fecha_cita', 'hora_cita', 'link_pago'],
    calido: ['nom_patient', 'fecha_cita', 'hora_cita', 'link_pago'],
  },
  anulacion: {
    standard: ['nom_patient', 'fecha_cita', 'hora_cita', 'reserva_url'],
    calido: ['nom_patient', 'fecha_cita', 'hora_cita', 'reserva_url'],
  },
  reprogramacion: {
    standard: ['nom_patient', 'nombre_cabinet', 'fecha_cita', 'hora_cita'],
    calido: ['nom_patient', 'nombre_cabinet', 'fecha_cita', 'hora_cita'],
  },
  // calido a 3 variables (praticien en plus), different de standard -- pas une faute de frappe.
  solicitud_resena: {
    standard: ['nom_patient', 'google_review_link'],
    calido: ['nom_patient', 'google_review_link', 'praticien'],
  },
}

// control_recall n'est pas un NotificationType -- catalogue separe, meme principe que
// CONTROL_RECALL_TWILIO_CONTENT_SIDS ci-dessus. Seul "standard" a ete cree cote Twilio pour
// l'instant ; "calido" reprend le meme ordre par defaut, a ajuster si/quand Martin cree ce template.
export const CONTROL_RECALL_TWILIO_VARIABLE_ORDER: Record<VariantId, string[]> = {
  standard: ['nom_patient', 'nombre_cabinet', 'reserva_url'],
  calido: ['nom_patient', 'nombre_cabinet', 'reserva_url'],
}

// Construit l'objet {"1": ..., "2": ..., ...} attendu par Twilio (contentVariables) a partir de
// l'ordre de variables ci-dessus et des valeurs internes nommees (buildTemplateValues()/vars).
// Leve une erreur plutot que d'envoyer silencieusement une variable vide si order/values se
// desynchronisent (ex. une cle renommee d'un cote sans l'autre).
export function buildTwilioContentVariables(order: string[], values: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  order.forEach((key, index) => {
    if (!(key in values)) {
      throw new Error(`buildTwilioContentVariables: clé "${key}" absente de values (position ${index + 1})`)
    }
    result[String(index + 1)] = values[key]
  })
  return result
}

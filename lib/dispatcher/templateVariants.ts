// Catalogue statique des variantes de messages proposées aux praticiens dans
// /dashboard/settings. Ce ne sont pas des templates éditables librement : ce sont
// des modèles prédéfinis (2 par type) que le praticien choisit via un bouton radio.
// Le contenu "standard" reprend exactement les templates par défaut existants
// (message_templates, organization_id null) — "calido" propose un ton plus chaleureux.
//
// Quand un praticien sélectionne une variante, son contenu (avec les variables et
// blocs {{#if}} intacts) est copié dans un override org-spécifique de message_templates
// (voir app/dashboard/settings/page.tsx) — le moteur de rendu ne change pas.

export type NotificationType = 'confirmation' | 'aviso' | 'pago' | 'anulacion' | 'recordatorio'
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

export const NOTIFICATION_TYPE_LABELS: Record<Langue, Record<NotificationType, string>> = {
  es: {
    confirmation: 'Confirmación de cita',
    aviso: 'Relance antes de anulación',
    pago: 'Pago recibido',
    anulacion: 'Anulación automática',
    recordatorio: 'Recordatorio de cita (24h)',
  },
  pt: {
    confirmation: 'Confirmação de consulta',
    aviso: 'Aviso antes do cancelamento',
    pago: 'Pagamento recebido',
    anulacion: 'Cancelamento automático',
    recordatorio: 'Lembrete de consulta (24h)',
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
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Para confirmarla, realiza el acompte de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">Costo total de la consulta: <strong>{{costo_total}} {{monnaie}}</strong> — {{monto_acompte}} {{monnaie}} de acompte ahora y <strong>{{resto_pagar}} {{monnaie}}</strong> en el consultorio el día de tu cita.</p>{{/if}}
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar acompte</a>`
          ),
        },
        pt: {
          sujet: 'Confirmação da sua consulta',
          corps: card(
            '#2563eb', '#1d4ed8', '📅', 'Sua consulta está reservada',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Olá {{nom_patient}}, sua consulta com <strong>{{nombre_cabinet}}</strong> está reservada para:</p>
${dateBox('às')}
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Para confirmar, realize o sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">Valor total da consulta: <strong>{{costo_total}} {{monnaie}}</strong> — {{monto_acompte}} {{monnaie}} de sinal agora e <strong>{{resto_pagar}} {{monnaie}}</strong> no consultório no dia da consulta.</p>{{/if}}
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar sinal</a>`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `📅 Hola {{nom_patient}}!\n\nTu cita con {{nombre_cabinet}} esta reservada:\n{{fecha_cita}} a las {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}\nPara confirmarla, realiza el acompte de {{monto_acompte}} {{monnaie}}:\n{{#if costo_desglose}}(Costo total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} en el consultorio)\n{{/if}}\n{{link_pago}}`,
        },
        pt: {
          corps: `📅 Ola {{nom_patient}}!\n\nSua consulta com {{nombre_cabinet}} esta reservada:\n{{fecha_cita}} as {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}\nPara confirmar, realize o sinal de {{monto_acompte}} {{monnaie}}:\n{{#if costo_desglose}}(Valor total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} no consultorio)\n{{/if}}\n{{link_pago}}`,
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
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Solo falta confirmar tu lugar con un acompte de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">El costo total es de <strong>{{costo_total}} {{monnaie}}</strong>: dejas {{monto_acompte}} {{monnaie}} ahora y el resto (<strong>{{resto_pagar}} {{monnaie}}</strong>) lo abonas tranquilamente en el consultorio.</p>{{/if}}
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Confirmar mi cita</a>`
          ),
        },
        pt: {
          sujet: 'Sua consulta já está quase pronta',
          corps: card(
            '#2563eb', '#1d4ed8', '💙', 'Que alegria, {{nom_patient}}!',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Ficou tudo certo para sua consulta com <strong>{{nombre_cabinet}}</strong>. Aqui está o resumo:</p>
${dateBox('às')}
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Só falta confirmar seu horário com um sinal de <strong>{{monto_acompte}} {{monnaie}}</strong>:</p>
    {{#if costo_desglose}}<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#6b7280;">O valor total é de <strong>{{costo_total}} {{monnaie}}</strong>: você deixa {{monto_acompte}} {{monnaie}} agora e paga o restante (<strong>{{resto_pagar}} {{monnaie}}</strong>) tranquilamente no consultório.</p>{{/if}}
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Confirmar minha consulta</a>`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `💙 ¡Qué alegría, {{nom_patient}}!\n\nQuedó todo listo para tu cita con {{nombre_cabinet}}:\n{{fecha_cita}} a las {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}\nSolo falta confirmar tu lugar con un acompte de {{monto_acompte}} {{monnaie}}:\n{{#if costo_desglose}}(Costo total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} en el consultorio)\n{{/if}}\n{{link_pago}}`,
        },
        pt: {
          corps: `💙 Que alegria, {{nom_patient}}!\n\nFicou tudo certo para sua consulta com {{nombre_cabinet}}:\n{{fecha_cita}} as {{hora_cita}}\n{{#if direccion}}📍 {{direccion}}\n{{/if}}\nSo falta confirmar seu horario com um sinal de {{monto_acompte}} {{monnaie}}:\n{{#if costo_desglose}}(Valor total: {{costo_total}} {{monnaie}}, resto {{resto_pagar}} {{monnaie}} no consultorio)\n{{/if}}\n{{link_pago}}`,
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
            '#b45309', '#92400e', '⏰', 'Falta tu acompte',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, aún no hemos recibido el acompte para tu cita con <strong>{{nombre_cabinet}}</strong>:</p>
${dateBox('a las')}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Si no pagas pronto, la cita será cancelada automáticamente.</p>
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#b45309;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Pagar acompte ahora</a>`
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
          corps: `⏰ Hola {{nom_patient}}, aun no hemos recibido el acompte para tu cita del {{fecha_cita}} a las {{hora_cita}}.\n\nSi no pagas pronto, la cita sera cancelada automaticamente. Evitalo aqui:\n{{link_pago}}`,
        },
        pt: {
          corps: `⏰ Ola {{nom_patient}}, ainda nao recebemos o sinal da sua consulta do dia {{fecha_cita}} as {{hora_cita}}.\n\nSe nao pagar em breve, a consulta sera cancelada automaticamente. Evite isso aqui:\n{{link_pago}}`,
        },
      },
    },
    calido: {
      email: {
        es: {
          sujet: 'No te olvides de tu acompte',
          corps: card(
            '#b45309', '#92400e', '🙂', 'Un empujoncito más, {{nom_patient}}',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Vimos que todavía no llega el acompte para tu cita con <strong>{{nombre_cabinet}}</strong>. ¡No pasa nada, todavía estás a tiempo!</p>
${dateBox('a las')}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Si prefieres mantener tu horario, complétalo aquí antes de que se libere:</p>
    <a href="{{link_pago}}" style="display:block;text-align:center;background:#b45309;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Completar mi acompte</a>`
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
          corps: `🙂 Hola {{nom_patient}}, un empujoncito mas: todavia no llega el acompte de tu cita del {{fecha_cita}} a las {{hora_cita}}.\n\nSi prefieres mantener tu horario, completalo aqui antes de que se libere:\n{{link_pago}}`,
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
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, hemos recibido tu acompte de <strong>{{monto_acompte}} {{monnaie}}</strong>.</p>
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
          corps: `✅ Hola {{nom_patient}}, recibimos tu acompte de {{monto_acompte}} {{monnaie}}.\n\nTu cita del {{fecha_cita}} a las {{hora_cita}} con {{nombre_cabinet}} esta confirmada.\n{{#if direccion}}📍 {{direccion}}\n{{/if}}{{#if costo_desglose}}Recuerda llevar {{resto_pagar}} {{monnaie}} el dia de tu cita.\n{{/if}}Te esperamos!`,
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
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Recibimos tu acompte de <strong>{{monto_acompte}} {{monnaie}}</strong>, ¡muchas gracias!</p>
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
          corps: `💚 ¡Gracias, {{nom_patient}}! Recibimos tu acompte de {{monto_acompte}} {{monnaie}}.\n\nTu cita del {{fecha_cita}} a las {{hora_cita}} con {{nombre_cabinet}} esta confirmada.\n{{#if direccion}}📍 {{direccion}}\n{{/if}}{{#if costo_desglose}}Recuerda traer {{resto_pagar}} {{monnaie}} el dia de tu cita.\n{{/if}}Nos vemos pronto!`,
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
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, tu cita con <strong>{{nombre_cabinet}}</strong> ha sido cancelada automáticamente por no recibir el acompte a tiempo:</p>
${dateBoxSimple('a las')}
    {{#if calendly_url}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Si deseas reagendar, hazlo aquí mismo:</p>
    <a href="{{calendly_url}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Reagendar cita</a>{{/if}}`
          ),
        },
        pt: {
          sujet: 'Consulta cancelada por falta de pagamento',
          corps: card(
            '#b91c1c', '#991b1b', '❌', 'Consulta cancelada',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Olá {{nom_patient}}, sua consulta com <strong>{{nombre_cabinet}}</strong> foi cancelada automaticamente por não recebermos o sinal a tempo:</p>
${dateBoxSimple('às')}
    {{#if calendly_url}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Se quiser reagendar, faça aqui mesmo:</p>
    <a href="{{calendly_url}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Reagendar consulta</a>{{/if}}`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `❌ Hola {{nom_patient}}, tu cita del {{fecha_cita}} a las {{hora_cita}} fue cancelada por falta de acompte.\n{{#if calendly_url}}\nSi deseas reagendar:\n{{calendly_url}}{{/if}}`,
        },
        pt: {
          corps: `❌ Ola {{nom_patient}}, sua consulta do dia {{fecha_cita}} as {{hora_cita}} foi cancelada por falta de sinal.\n{{#if calendly_url}}\nSe quiser reagendar:\n{{calendly_url}}{{/if}}`,
        },
      },
    },
    calido: {
      email: {
        es: {
          sujet: 'Tu horario quedó liberado',
          corps: card(
            '#b91c1c', '#991b1b', '🙁', 'No hay problema, {{nom_patient}}',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Como no llegamos a recibir el acompte a tiempo, tu horario con <strong>{{nombre_cabinet}}</strong> quedó liberado:</p>
${dateBoxSimple('a las')}
    {{#if calendly_url}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Cuando quieras, puedes elegir un nuevo horario aquí:</p>
    <a href="{{calendly_url}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Elegir nuevo horario</a>{{/if}}`
          ),
        },
        pt: {
          sujet: 'Seu horário foi liberado',
          corps: card(
            '#b91c1c', '#991b1b', '🙁', 'Sem problemas, {{nom_patient}}',
            `    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#1f2937;">Como não recebemos o sinal a tempo, seu horário com <strong>{{nombre_cabinet}}</strong> foi liberado:</p>
${dateBoxSimple('às')}
    {{#if calendly_url}}<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937;">Quando quiser, você pode escolher um novo horário aqui:</p>
    <a href="{{calendly_url}}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Escolher novo horário</a>{{/if}}`
          ),
        },
      },
      whatsapp: {
        es: {
          corps: `🙁 Hola {{nom_patient}}, no hay problema: tu horario del {{fecha_cita}} a las {{hora_cita}} quedo liberado por no llegar el acompte a tiempo.\n{{#if calendly_url}}\nCuando quieras, elige un nuevo horario aqui:\n{{calendly_url}}{{/if}}`,
        },
        pt: {
          corps: `🙁 Ola {{nom_patient}}, sem problemas: seu horario do dia {{fecha_cita}} as {{hora_cita}} foi liberado por nao recebermos o sinal a tempo.\n{{#if calendly_url}}\nQuando quiser, escolha um novo horario aqui:\n{{calendly_url}}{{/if}}`,
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
      es: 'Tu cita está reservada\nHola María López, tu cita con Clínica Bienestar está reservada para el 15 de marzo de 2026 a las 10:00.\nPara confirmarla, realiza el acompte de 20.00 PEN.',
      pt: 'Olá [Nome], sua consulta com [Clínica] está agendada para [Data] às [Hora]. Para confirmá-la, realize o sinal de [Valor] PEN.',
    },
    calido: {
      es: '¡Qué alegría, María López!\nQuedó todo listo para tu cita con Clínica Bienestar. Este es el detalle: 15 de marzo de 2026 a las 10:00.\nSolo falta confirmar tu lugar con un acompte de 20.00 PEN.',
      pt: 'Que alegria, [Nome]! Tudo pronto para sua consulta com [Clínica]. Detalhe: [Data] às [Hora]. Só falta confirmar seu lugar com um sinal de [Valor] PEN.',
    },
  },
  aviso: {
    standard: {
      es: 'Falta tu acompte\nHola María López, aún no hemos recibido el acompte para tu cita con Clínica Bienestar.\nSi no pagas pronto, la cita será cancelada automáticamente.',
      pt: 'Falta seu sinal. Olá [Nome], ainda não recebemos o sinal para sua consulta com [Clínica]. Se não pagar em breve, a consulta será cancelada automaticamente.',
    },
    calido: {
      es: 'Un empujoncito más, María López\nVimos que todavía no llega el acompte para tu cita con Clínica Bienestar. ¡No pasa nada, todavía estás a tiempo!\nSi prefieres mantener tu horario, complétalo aquí antes de que se libere.',
      pt: 'Um empurrãozinho, [Nome]! Vimos que o sinal para sua consulta com [Clínica] ainda não chegou. Sem problema, você ainda está a tempo! Se quiser manter seu horário, complete aqui antes que seja liberado.',
    },
  },
  pago: {
    standard: {
      es: '¡Pago recibido!\nHola María López, hemos recibido tu acompte de 20.00 PEN.\nTu cita con Clínica Bienestar está confirmada. ¡Te esperamos!',
      pt: 'Pagamento recebido! Olá [Nome], recebemos seu sinal de [Valor] PEN. Sua consulta com [Clínica] está confirmada. Te esperamos!',
    },
    calido: {
      es: '¡Todo listo, María López!\nRecibimos tu acompte de 20.00 PEN, ¡muchas gracias!\nTu cita con Clínica Bienestar está confirmada. ¡Nos vemos pronto!',
      pt: 'Tudo certo, [Nome]! Recebemos seu sinal de [Valor] PEN, obrigado! Sua consulta com [Clínica] está confirmada. Até logo!',
    },
  },
  anulacion: {
    standard: {
      es: 'Cita cancelada\nHola María López, tu cita con Clínica Bienestar ha sido cancelada automáticamente por no recibir el acompte a tiempo.\nSi deseas reagendar, hazlo aquí mismo.',
      pt: 'Consulta cancelada. Olá [Nome], sua consulta com [Clínica] foi cancelada automaticamente por não receber o sinal a tempo. Se quiser reagendar, faça aqui mesmo.',
    },
    calido: {
      es: 'No hay problema, María López\nComo no llegamos a recibir el acompte a tiempo, tu horario con Clínica Bienestar quedó liberado.\nCuando quieras, puedes elegir un nuevo horario aquí.',
      pt: 'Sem problema, [Nome]! Como não recebemos o sinal a tempo, seu horário com [Clínica] foi liberado. Quando quiser, você pode escolher um novo horário aqui.',
    },
  },
  recordatorio: {
    standard: {
      es: 'Te esperamos\nHola María López, te recordamos tu cita con Clínica Bienestar: 15 de marzo de 2026 a las 10:00.',
      pt: 'Te esperamos! Olá [Nome], lembramos sua consulta com [Clínica]: [Data] às [Hora].',
    },
    calido: {
      es: '¡Te esperamos, María López!\nSolo un recordatorio cariñoso de tu cita con Clínica Bienestar: 15 de marzo de 2026 a las 10:00.',
      pt: 'Te esperamos, [Nome]! Só um lembrete carinhoso da sua consulta com [Clínica]: [Data] às [Hora].',
    },
  },
}

export function getPreview(type: NotificationType, variant: VariantId, langue: Langue): string {
  return PREVIEWS[type][variant][langue]
}

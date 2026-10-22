-- WhatsApp via l'API officielle Twilio, en complement d'Unipile (pas en remplacement immediat) --
-- bascule explicite par organisation le temps que chaque praticien fasse verifier son compte
-- WhatsApp Business par Meta. 'unipile' reste le defaut pour toutes les organisations existantes.
alter table org_settings
  add column if not exists canal_whatsapp_provider text not null default 'unipile'
    check (canal_whatsapp_provider in ('unipile', 'twilio')),
  add column if not exists twilio_subaccount_sid text,
  add column if not exists twilio_whatsapp_number text,
  add column if not exists twilio_auth_token_encrypted text;

-- Correlation du callback de statut Twilio (app/api/webhooks/twilio) avec la ligne notifications
-- qui a declenche l'envoi, et date de livraison confirmee -- distincte de sent_at (qui marque la
-- remise reussie a l'API Twilio, pas la livraison confirmee au telephone du patient). statut reste
-- volontairement sur l'enum existant ('pending'/'sent'/'failed') : un "delivered" Twilio renseigne
-- delivered_at sans changer statut (deja 'sent'), un "failed"/"undelivered" passe statut a 'failed'.
alter table notifications
  add column if not exists twilio_message_sid text,
  add column if not exists delivered_at timestamptz;

create index if not exists notifications_twilio_message_sid_idx on notifications(twilio_message_sid) where twilio_message_sid is not null;

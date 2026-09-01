-- Stocke la variante de message choisie par le praticien pour chaque type
-- de notification (confirmation, aviso, pago, anulacion, recordatorio).
-- Format : {"confirmation": "standard", "aviso": "calido", ...}
-- Absence de cle = variante "standard" par defaut.
-- Le contenu des variantes est defini dans le code (lib/dispatcher/templateVariants.ts),
-- pas en base : cette colonne ne stocke que le choix, pas le texte.

alter table org_settings add column if not exists variantes_mensaje jsonb not null default '{}'::jsonb;

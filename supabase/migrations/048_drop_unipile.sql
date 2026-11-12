-- Unipile n'est plus utilise par aucune organisation (confirme par Martin le 2026-11-12) --
-- Twilio devient l'unique canal WhatsApp. Colonnes retirees definitivement, pas juste videes.
alter table org_settings
  drop column if exists unipile_account_id,
  drop column if exists unipile_connected_at,
  drop column if exists canal_whatsapp_provider;

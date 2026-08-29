-- Date de connexion du compte Unipile, point de départ de la chauffe progressive du numéro.
alter table org_settings add column unipile_connected_at timestamptz;

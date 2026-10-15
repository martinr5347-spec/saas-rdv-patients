-- Migration 030: escalade de la relance "proximo control" + variante standard/calido configurable + delai d'anticipation

-- Relance d'escalade : si la premiere invitation a ete envoyee (proximo_control_enviado = true)
-- et que la date de controle est depassee de plus d'un mois sans nouveau geste, on relance une
-- fois avec le meme contenu (pas de nouveau message a rediger). Reinitialise a false des qu'un
-- nouveau controle est programme ou que la relance en cours est annulee.
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS proximo_control_relanzado boolean NOT NULL DEFAULT false;

-- variante_control_recall : meme principe standard/calido que variantes_mensaje (JSON, 5 types
-- existants deja en place), mais en colonne dediee plutot que dans variantes_mensaje/NotificationType --
-- ce type n'a qu'un canal (email), pas besoin d'imposer une variante whatsapp inutilisee.
--
-- control_recall_anticipacion_dias : decale l'envoi de l'invitation a N jours AVANT la date de
-- controle reelle (proximo_control_fecha), pour laisser au praticien le temps d'avoir des creneaux
-- Calendly ouverts a cette echeance. Ne change pas le calcul de l'escalade ci-dessus, qui reste
-- base sur la date de controle elle-meme.
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS variante_control_recall text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS control_recall_anticipacion_dias integer NOT NULL DEFAULT 14;

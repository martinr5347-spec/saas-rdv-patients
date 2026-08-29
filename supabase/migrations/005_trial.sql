-- Essai gratuit 7 jours sans carte bancaire.
alter table subscriptions add column trial_ends_at timestamptz;

alter table subscriptions drop constraint subscriptions_statut_check;
alter table subscriptions add constraint subscriptions_statut_check
  check (statut in ('pending', 'trial', 'active', 'past_due', 'canceled'));

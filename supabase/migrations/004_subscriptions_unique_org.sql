-- Un tenant ne doit avoir qu'un seul abonnement (comme org_settings). Sans cette contrainte,
-- un upsert sur organization_id ne peut pas cibler la bonne ligne et en crée une nouvelle à chaque fois.
alter table subscriptions add constraint subscriptions_organization_id_key unique (organization_id);

-- Migration 055: etat du tour d'onboarding guide (react-joyride) du dashboard.
--
-- onboarding_sidebar_seen : tour niveau 1 (survol de la sidebar), declenche une seule fois a la
-- toute premiere connexion.
-- onboarding_pages_seen : tour niveau 2 (contenu reel d'une page), un id entre dans ce tableau des
-- que son tour a ete vu (termine ou "Saltar"), a n'importe quel moment de la vie du compte --
-- jamais de fenetre de connexions qui expire, cf. prompt onboarding-tour-guide.
-- onboarding_disabled : desactivation volontaire par le praticien (menu "?" du Header) de tout
-- declenchement automatique (niveau 1 et 2) -- le rejeu manuel depuis ce meme menu reste toujours
-- possible independamment de cette valeur.

alter table users add column if not exists onboarding_sidebar_seen boolean not null default false;
alter table users add column if not exists onboarding_pages_seen jsonb not null default '[]'::jsonb;
alter table users add column if not exists onboarding_disabled boolean not null default false;

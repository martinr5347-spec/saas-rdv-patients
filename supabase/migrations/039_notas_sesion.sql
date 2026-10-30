-- Migration 039: regroupement reel (pas visuel) des notes clinicas prises dans une meme session de
-- saisie. sesion_id nullable : les notes existantes avant cette migration n'en ont pas (pas de
-- migration retroactive -- aucun moyen fiable de savoir lesquelles appartenaient au meme rendez-vous),
-- affichees chacune dans leur propre cadre individuel cote client plutot qu'un faux regroupement par date.

alter table patient_notes
  add column if not exists sesion_id uuid default null;

create index if not exists idx_patient_notes_sesion_id on patient_notes (sesion_id);

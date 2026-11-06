-- Migration 045 : tag optionnel "Antes/Después" sur les photos de notes cliniques (fiche patient en
-- onglets) -- nullable, les photos deja existantes restent affichees normalement sans tag.

alter table patient_note_photos
  add column momento text check (momento in ('antes', 'despues'));

-- Migration 053: 3 modeles visuels de prescription + Instagram optionnel du praticien.
--
-- users.especialidad (texte libre, carte "Mon profil" de Configuracion) existait deja avant cette
-- migration -- rien a ajouter cote colonne pour la specialite exacte, seulement la brancher sur le
-- PDF (lib/pdf/prescripcionPdf.tsx). Cf. prompt prescripcion-plantillas-branding.

alter table users add column if not exists instagram text default null;

alter table org_settings add column if not exists plantilla_prescripcion text not null default 'clasico'
  check (plantilla_prescripcion in ('clasico', 'minimalista', 'moderno'));

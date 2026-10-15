-- Migration 029: notes groupees par date + categorie "Control" + relance automatique liee a une photo

-- Relance "proximo control" (1-12 mois), + lien vers la note de diagnostic dont la photo doit
-- resurgir le jour du controle. ON DELETE SET NULL : si la note de diagnostic est supprimee,
-- on ne supprime pas la relance, on perd juste le lien vers la photo.
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS proximo_control_fecha date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS proximo_control_meses integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS proximo_control_enviado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS proximo_control_enviado_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS proximo_control_photo_note_id uuid REFERENCES patient_notes(id) ON DELETE SET NULL DEFAULT NULL;

-- Categories (parmi celles personnalisables, categorias_notas) qui affichent le bouton photo.
-- "Control" n'est PAS dans cette liste : c'est une categorie reservee geree en dur cote front,
-- toujours autorisee a avoir une photo, pour ne pas la melanger avec les categories personnalisables
-- (si l'organisation renomme/supprime ses categories, "Control" doit continuer a fonctionner).
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS categorias_con_foto text[] NOT NULL DEFAULT ARRAY['Diagnóstico'];

-- Templates par defaut (es + pt), email uniquement.
INSERT INTO message_templates (organization_id, type, canal, langue, sujet, corps)
SELECT NULL, 'control_recall', 'email', 'es',
  'Es momento de tu control',
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:linear-gradient(135deg,#6926D2,#4c1d95);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#128197;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">Es momento de tu control</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Hola {{nom_patient}}, ha llegado el momento de programar tu consulta de control con <strong>{{nombre_cabinet}}</strong>.</p>
    {{#if calendly_url}}
    <a href="{{calendly_url}}" style="display:block;text-align:center;background:#6926D2;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Reservar mi cita</a>
    {{/if}}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates WHERE organization_id IS NULL AND type = 'control_recall' AND canal = 'email' AND langue = 'es'
);

INSERT INTO message_templates (organization_id, type, canal, langue, sujet, corps)
SELECT NULL, 'control_recall', 'email', 'pt',
  'É hora do seu retorno',
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:linear-gradient(135deg,#6926D2,#4c1d95);padding:32px 24px;text-align:center;">
    <div style="font-size:36px;line-height:1;margin:0 0 8px;">&#128197;</div>
    <h1 style="margin:0;font-size:19px;color:#ffffff;font-weight:700;">É hora do seu retorno</h1>
  </div>
  <div style="padding:28px 24px;">
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1f2937;">Olá {{nom_patient}}, chegou a hora de agendar sua consulta de retorno com <strong>{{nombre_cabinet}}</strong>.</p>
    {{#if calendly_url}}
    <a href="{{calendly_url}}" style="display:block;text-align:center;background:#6926D2;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;font-weight:600;">Agendar minha consulta</a>
    {{/if}}
  </div>
  <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">{{nombre_cabinet}}</p>
  </div>
</div>'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates WHERE organization_id IS NULL AND type = 'control_recall' AND canal = 'email' AND langue = 'pt'
);

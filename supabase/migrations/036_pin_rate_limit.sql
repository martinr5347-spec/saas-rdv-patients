-- Limite de tentatives anti-brute-force sur le PIN des notas clinicas (users.codigo_seguridad_hash).
-- 5 echecs consecutifs -> verrouillage temporaire 15 min (cf. lib/security/verifyCodigo.ts).
alter table users
  add column if not exists codigo_intentos_fallidos integer not null default 0,
  add column if not exists codigo_bloqueado_hasta timestamptz;

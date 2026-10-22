-- RLS en `accesos_conocimiento`, que se creo en 20261021131833_acceso_conocimiento
-- sin activarlo (las demas tablas lo tienen desde 20261008120100). Mismo motivo:
-- en Supabase la API REST expone `public` con la clave `anon`; el backend entra
-- como `postgres`, dueño de la tabla, y no pasa por RLS.
-- Para deshacer: ALTER TABLE "accesos_conocimiento" DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS "accesos_conocimiento" ENABLE ROW LEVEL SECURITY;

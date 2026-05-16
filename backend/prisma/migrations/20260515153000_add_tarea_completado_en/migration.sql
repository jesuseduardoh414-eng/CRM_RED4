ALTER TABLE "tareas"
ADD COLUMN "completadoEn" TIMESTAMP(3);

UPDATE "tareas" t
SET "completadoEn" = COALESCE(
  (
    SELECT MAX(l."creadoEn")
    FROM "logs_actividad" l
    WHERE l."tareaId" = t."id"
      AND l."accion" = 'CAMBIO_ESTADO'
      AND l."descripcion" ILIKE '%HECHO%'
  ),
  t."creadoEn"
)
WHERE t."estado" = 'HECHO'
  AND t."completadoEn" IS NULL;


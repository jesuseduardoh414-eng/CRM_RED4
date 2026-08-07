-- Normaliza los estados de proyecto al catalogo definido en
-- src/utils/estados.utils.js: ACTIVO / INACTIVO / TERMINADO / ARCHIVADO.
--
-- Antes la columna era texto libre y convivian varios nombres para lo mismo.
-- Los UPDATE son idempotentes: si ya se corrieron, no afectan ninguna fila.

UPDATE "proyectos"
   SET "estado" = 'INACTIVO'
 WHERE "estado" IN ('EN_PAUSA', 'PAUSA', 'PAUSADO', 'PENDIENTE');

UPDATE "proyectos"
   SET "estado" = 'TERMINADO'
 WHERE "estado" IN ('CERRADO', 'FINALIZADO', 'HECHO');

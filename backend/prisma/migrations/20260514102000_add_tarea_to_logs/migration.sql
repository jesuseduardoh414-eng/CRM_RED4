ALTER TABLE "logs_actividad" ADD COLUMN "tareaId" INTEGER;

ALTER TABLE "logs_actividad"
ADD CONSTRAINT "logs_actividad_tareaId_fkey"
FOREIGN KEY ("tareaId") REFERENCES "tareas"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

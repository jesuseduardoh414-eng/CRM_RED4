ALTER TABLE "tareas" ADD COLUMN "creadorId" INTEGER;

ALTER TABLE "tareas"
ADD CONSTRAINT "tareas_creadorId_fkey"
FOREIGN KEY ("creadorId") REFERENCES "usuarios"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

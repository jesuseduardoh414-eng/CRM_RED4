ALTER TABLE "notificaciones"
ADD COLUMN "proyectoId" INTEGER,
ADD COLUMN "eventoId" UUID,
ADD COLUMN "actorNombre" TEXT;

ALTER TABLE "notificaciones"
ADD CONSTRAINT "notificaciones_proyectoId_fkey"
FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "notificaciones"
ADD CONSTRAINT "notificaciones_eventoId_fkey"
FOREIGN KEY ("eventoId") REFERENCES "eventos"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

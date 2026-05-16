ALTER TABLE "tareas"
ADD COLUMN "numeroActividad" INTEGER;

CREATE INDEX "tareas_proyectoId_numeroActividad_idx"
ON "tareas"("proyectoId", "numeroActividad");

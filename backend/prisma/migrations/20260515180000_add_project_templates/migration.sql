CREATE TABLE "plantillas_proyecto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "area" TEXT NOT NULL DEFAULT 'DESARROLLO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadorId" INTEGER NOT NULL,
    "proyectoBaseId" INTEGER,

    CONSTRAINT "plantillas_proyecto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plantillas_tarea" (
    "id" SERIAL NOT NULL,
    "plantillaId" INTEGER NOT NULL,
    "clave" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'MEDIA',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "offsetInicioDias" INTEGER NOT NULL DEFAULT 0,
    "offsetVenceDias" INTEGER,
    "dependeDeClave" TEXT,

    CONSTRAINT "plantillas_tarea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plantillas_tarea_plantillaId_clave_key" ON "plantillas_tarea"("plantillaId", "clave");

ALTER TABLE "plantillas_proyecto"
ADD CONSTRAINT "plantillas_proyecto_creadorId_fkey"
FOREIGN KEY ("creadorId") REFERENCES "usuarios"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "plantillas_proyecto"
ADD CONSTRAINT "plantillas_proyecto_proyectoBaseId_fkey"
FOREIGN KEY ("proyectoBaseId") REFERENCES "proyectos"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "plantillas_tarea"
ADD CONSTRAINT "plantillas_tarea_plantillaId_fkey"
FOREIGN KEY ("plantillaId") REFERENCES "plantillas_proyecto"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

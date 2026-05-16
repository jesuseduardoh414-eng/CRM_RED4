ALTER TABLE "eventos"
ADD COLUMN "modalidad" TEXT NOT NULL DEFAULT 'presencial',
ADD COLUMN "ubicacion" TEXT,
ADD COLUMN "url_reunion" TEXT,
ADD COLUMN "instrucciones_acceso" TEXT;

ALTER TABLE "adjuntos"
ADD COLUMN "eventoId" UUID;

ALTER TABLE "adjuntos"
ADD CONSTRAINT "adjuntos_eventoId_fkey"
FOREIGN KEY ("eventoId") REFERENCES "eventos"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

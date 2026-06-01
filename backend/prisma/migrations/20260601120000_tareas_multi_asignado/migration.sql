CREATE TABLE "_AsignadosMultiplesTarea" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

CREATE UNIQUE INDEX "_AsignadosMultiplesTarea_AB_unique" ON "_AsignadosMultiplesTarea"("A", "B");
CREATE INDEX "_AsignadosMultiplesTarea_B_index" ON "_AsignadosMultiplesTarea"("B");

ALTER TABLE "_AsignadosMultiplesTarea"
ADD CONSTRAINT "_AsignadosMultiplesTarea_A_fkey"
FOREIGN KEY ("A") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_AsignadosMultiplesTarea"
ADD CONSTRAINT "_AsignadosMultiplesTarea_B_fkey"
FOREIGN KEY ("B") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "_AsignadosMultiplesTarea" ("A", "B")
SELECT "id", "asignadoId"
FROM "tareas"
WHERE "asignadoId" IS NOT NULL
ON CONFLICT DO NOTHING;

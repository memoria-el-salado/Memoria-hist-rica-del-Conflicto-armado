-- AlterTable
ALTER TABLE "MarcaCartografia" ADD COLUMN     "audioArchivo" TEXT,
ADD COLUMN     "audioMime" TEXT,
ADD COLUMN     "audioSegundos" INTEGER,
ADD COLUMN     "foto" TEXT,
ADD COLUMN     "grupoId" TEXT;

-- AddForeignKey
ALTER TABLE "MarcaCartografia" ADD CONSTRAINT "MarcaCartografia_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;


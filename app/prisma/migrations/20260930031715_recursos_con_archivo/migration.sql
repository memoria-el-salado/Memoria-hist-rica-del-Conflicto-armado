-- AlterEnum
ALTER TYPE "TipoRecurso" ADD VALUE 'IMAGEN';

-- AlterTable
ALTER TABLE "Recurso" ADD COLUMN     "archivo" TEXT,
ADD COLUMN     "enlace" TEXT,
ADD COLUMN     "mime" TEXT,
ADD COLUMN     "sesionId" TEXT,
ADD COLUMN     "tamano" INTEGER;

-- AddForeignKey
ALTER TABLE "Recurso" ADD CONSTRAINT "Recurso_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;


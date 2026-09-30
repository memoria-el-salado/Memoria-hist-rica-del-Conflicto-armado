-- AlterTable
ALTER TABLE "Anotacion" ADD COLUMN     "destacada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "respuestaAId" TEXT;

-- CreateTable
CREATE TABLE "MeSirve" (
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anotacionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MeSirve_pkey" PRIMARY KEY ("anotacionId","userId")
);

-- AddForeignKey
ALTER TABLE "Anotacion" ADD CONSTRAINT "Anotacion_respuestaAId_fkey" FOREIGN KEY ("respuestaAId") REFERENCES "Anotacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeSirve" ADD CONSTRAINT "MeSirve_anotacionId_fkey" FOREIGN KEY ("anotacionId") REFERENCES "Anotacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeSirve" ADD CONSTRAINT "MeSirve_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


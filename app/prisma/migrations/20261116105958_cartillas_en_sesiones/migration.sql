-- AlterTable
ALTER TABLE "DocumentoFuente" ADD COLUMN     "ubicaciones" JSONB;

-- CreateTable
CREATE TABLE "DocumentoVinculado" (
    "casoId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoVinculado_pkey" PRIMARY KEY ("casoId","documentoId")
);

-- AddForeignKey
ALTER TABLE "DocumentoVinculado" ADD CONSTRAINT "DocumentoVinculado_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVinculado" ADD CONSTRAINT "DocumentoVinculado_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "DocumentoFuente"("id") ON DELETE CASCADE ON UPDATE CASCADE;


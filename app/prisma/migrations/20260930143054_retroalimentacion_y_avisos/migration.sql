-- AlterTable
ALTER TABLE "Sesion" ADD COLUMN     "publicadaEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avisosVistosEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Comentario" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leidoEn" TIMESTAMP(3),
    "docenteId" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "sesionId" TEXT,
    "respuestaId" TEXT,
    "simulacionId" TEXT,
    "entradaId" TEXT,

    CONSTRAINT "Comentario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comentario_estudianteId_leidoEn_idx" ON "Comentario"("estudianteId", "leidoEn");

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_respuestaId_fkey" FOREIGN KEY ("respuestaId") REFERENCES "RespuestaActividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "Simulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "EntradaDiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;


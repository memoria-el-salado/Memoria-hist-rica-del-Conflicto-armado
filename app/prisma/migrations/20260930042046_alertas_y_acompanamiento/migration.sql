-- AlterTable
ALTER TABLE "Sesion" ADD COLUMN     "textoAlerta" TEXT;

-- CreateTable
CREATE TABLE "SolicitudAcompanamiento" (
    "id" TEXT NOT NULL,
    "mensaje" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendidaEn" TIMESTAMP(3),
    "estudianteId" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "sesionId" TEXT,

    CONSTRAINT "SolicitudAcompanamiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitudAcompanamiento_docenteId_atendidaEn_idx" ON "SolicitudAcompanamiento"("docenteId", "atendidaEn");

-- AddForeignKey
ALTER TABLE "SolicitudAcompanamiento" ADD CONSTRAINT "SolicitudAcompanamiento_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudAcompanamiento" ADD CONSTRAINT "SolicitudAcompanamiento_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudAcompanamiento" ADD CONSTRAINT "SolicitudAcompanamiento_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;


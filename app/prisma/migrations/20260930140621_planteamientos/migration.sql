-- CreateTable
CREATE TABLE "PlanteamientoSesion" (
    "id" TEXT NOT NULL,
    "datos" JSONB NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "sesionId" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,

    CONSTRAINT "PlanteamientoSesion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanteamientoSesion_sesionId_docenteId_key" ON "PlanteamientoSesion"("sesionId", "docenteId");

-- AddForeignKey
ALTER TABLE "PlanteamientoSesion" ADD CONSTRAINT "PlanteamientoSesion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanteamientoSesion" ADD CONSTRAINT "PlanteamientoSesion_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


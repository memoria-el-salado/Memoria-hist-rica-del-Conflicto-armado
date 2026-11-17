-- CreateTable
CREATE TABLE "RespuestaCartilla" (
    "id" TEXT NOT NULL,
    "actividad" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "datos" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,

    CONSTRAINT "RespuestaCartilla_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RespuestaCartilla_sesionId_actividad_idx" ON "RespuestaCartilla"("sesionId", "actividad");

-- CreateIndex
CREATE UNIQUE INDEX "RespuestaCartilla_userId_sesionId_actividad_key" ON "RespuestaCartilla"("userId", "sesionId", "actividad");

-- AddForeignKey
ALTER TABLE "RespuestaCartilla" ADD CONSTRAINT "RespuestaCartilla_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespuestaCartilla" ADD CONSTRAINT "RespuestaCartilla_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;


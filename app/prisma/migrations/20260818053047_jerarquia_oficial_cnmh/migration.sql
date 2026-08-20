-- AlterTable
ALTER TABLE "Eje" ADD COLUMN     "esPreambulo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "objetivoGeneral" TEXT;

-- AlterTable
ALTER TABLE "Sesion" ADD COLUMN     "objetivo" TEXT;

-- CreateTable
CREATE TABLE "Subseccion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "sesionId" TEXT NOT NULL,

    CONSTRAINT "Subseccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoFuente" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "rutaArchivo" TEXT NOT NULL,
    "paginas" INTEGER NOT NULL,
    "subidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "casoId" TEXT,

    CONSTRAINT "DocumentoFuente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subseccion_sesionId_codigo_key" ON "Subseccion"("sesionId", "codigo");

-- AddForeignKey
ALTER TABLE "Subseccion" ADD CONSTRAINT "Subseccion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoFuente" ADD CONSTRAINT "DocumentoFuente_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

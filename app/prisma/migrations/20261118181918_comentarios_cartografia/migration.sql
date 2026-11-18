-- AlterTable
ALTER TABLE "Foro" ADD COLUMN     "marcaId" TEXT;

-- CreateTable
CREATE TABLE "ComentarioMarca" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marcaId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "ComentarioMarca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComentarioMarca_marcaId_idx" ON "ComentarioMarca"("marcaId");

-- AddForeignKey
ALTER TABLE "ComentarioMarca" ADD CONSTRAINT "ComentarioMarca_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "MarcaCartografia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComentarioMarca" ADD CONSTRAINT "ComentarioMarca_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foro" ADD CONSTRAINT "Foro_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "MarcaCartografia"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "Creacion" AS ENUM ('NINGUNA', 'CARTA', 'POEMA', 'DIBUJO', 'FOTO');

-- AlterTable
ALTER TABLE "FlorJardin" ADD COLUMN     "creacion" "Creacion" NOT NULL DEFAULT 'NINGUNA',
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "imagen" TEXT,
ADD COLUMN     "texto" TEXT;


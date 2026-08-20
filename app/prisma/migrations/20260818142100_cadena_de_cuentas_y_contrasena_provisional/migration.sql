/*
  Warnings:

  - Changed the type of `tags` on the `MarcaCartografia` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "MarcaCartografia" DROP COLUMN "tags",
ADD COLUMN     "tags" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "contrasenaCambiadaEn" TIMESTAMP(3),
ADD COLUMN     "creadoPorId" TEXT,
ADD COLUMN     "debeCambiarContrasena" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

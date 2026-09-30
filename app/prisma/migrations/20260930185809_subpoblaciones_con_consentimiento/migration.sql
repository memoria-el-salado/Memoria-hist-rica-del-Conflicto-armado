-- AlterTable
ALTER TABLE "ReporteDiferenciado" ADD COLUMN     "docenteId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subpoblacionConsentidaEn" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "ReporteDiferenciado" ADD CONSTRAINT "ReporteDiferenciado_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


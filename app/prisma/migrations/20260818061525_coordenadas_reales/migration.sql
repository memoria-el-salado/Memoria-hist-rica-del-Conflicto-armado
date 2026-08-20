/*
  Warnings:

  - You are about to drop the column `x` on the `MarcaCartografia` table. All the data in the column will be lost.
  - You are about to drop the column `y` on the `MarcaCartografia` table. All the data in the column will be lost.
  - Added the required column `lat` to the `MarcaCartografia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lon` to the `MarcaCartografia` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Caso" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lon" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "MarcaCartografia" DROP COLUMN "x",
DROP COLUMN "y",
ADD COLUMN     "lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lon" DOUBLE PRECISION NOT NULL;

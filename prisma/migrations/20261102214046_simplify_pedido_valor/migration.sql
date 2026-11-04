/*
  Warnings:

  - You are about to drop the column `bv` on the `pedidos` table. All the data in the column will be lost.
  - You are about to drop the column `bv_pct` on the `pedidos` table. All the data in the column will be lost.
  - You are about to drop the column `taxa` on the `pedidos` table. All the data in the column will be lost.
  - You are about to drop the column `taxa_pct` on the `pedidos` table. All the data in the column will be lost.
  - You are about to drop the column `valor_bruto` on the `pedidos` table. All the data in the column will be lost.
  - You are about to drop the column `valor_liquido` on the `pedidos` table. All the data in the column will be lost.
  - Added the required column `valor` to the `pedidos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pedidos" DROP COLUMN "bv",
DROP COLUMN "bv_pct",
DROP COLUMN "taxa",
DROP COLUMN "taxa_pct",
DROP COLUMN "valor_bruto",
DROP COLUMN "valor_liquido",
ADD COLUMN     "valor" DECIMAL(14,2) NOT NULL;

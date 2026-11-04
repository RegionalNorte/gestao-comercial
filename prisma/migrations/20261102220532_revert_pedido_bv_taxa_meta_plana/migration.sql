/*
  Warnings:

  - You are about to drop the column `verba_orcada_liquida` on the `metas` table. All the data in the column will be lost.
  - You are about to drop the column `valor` on the `pedidos` table. All the data in the column will be lost.
  - Added the required column `bv` to the `pedidos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bv_pct` to the `pedidos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxa` to the `pedidos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxa_pct` to the `pedidos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valor_bruto` to the `pedidos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valor_liquido` to the `pedidos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "metas" DROP COLUMN "verba_orcada_liquida";

-- AlterTable
ALTER TABLE "pedidos" DROP COLUMN "valor",
ADD COLUMN     "bv" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "bv_pct" DECIMAL(6,4) NOT NULL,
ADD COLUMN     "taxa" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "taxa_pct" DECIMAL(6,4) NOT NULL,
ADD COLUMN     "valor_bruto" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "valor_liquido" DECIMAL(14,2) NOT NULL;

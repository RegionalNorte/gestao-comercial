/*
  Warnings:

  - Added the required column `data_desejada` to the `pedidos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "data_desejada" TIMESTAMP(3) NOT NULL;

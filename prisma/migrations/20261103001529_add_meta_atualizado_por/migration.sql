-- AlterTable
ALTER TABLE "metas" ADD COLUMN     "atualizado_por_id" TEXT;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_atualizado_por_id_fkey" FOREIGN KEY ("atualizado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

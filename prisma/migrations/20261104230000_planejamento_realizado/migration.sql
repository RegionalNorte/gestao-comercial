-- AlterTable
ALTER TABLE "planejamentos" ADD COLUMN     "realizado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "realizado_em" TIMESTAMP(3),
ADD COLUMN     "realizado_por_id" TEXT;

-- AddForeignKey
ALTER TABLE "planejamentos" ADD CONSTRAINT "planejamentos_realizado_por_id_fkey" FOREIGN KEY ("realizado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

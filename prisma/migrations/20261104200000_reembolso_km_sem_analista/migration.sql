-- AlterEnum
BEGIN;
CREATE TYPE "StatusReembolsoKm_new" AS ENUM ('PENDENTE', 'PRE_APROVADO', 'APROVADO', 'REJEITADO');
ALTER TABLE "public"."reembolsos_km" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "reembolsos_km" ALTER COLUMN "status" TYPE "StatusReembolsoKm_new" USING ("status"::text::"StatusReembolsoKm_new");
ALTER TABLE "reembolso_km_eventos" ALTER COLUMN "tipo" TYPE "StatusReembolsoKm_new" USING ("tipo"::text::"StatusReembolsoKm_new");
ALTER TYPE "StatusReembolsoKm" RENAME TO "StatusReembolsoKm_old";
ALTER TYPE "StatusReembolsoKm_new" RENAME TO "StatusReembolsoKm";
DROP TYPE "public"."StatusReembolsoKm_old";
ALTER TABLE "reembolsos_km" ALTER COLUMN "status" SET DEFAULT 'PENDENTE';
COMMIT;

-- AlterTable
ALTER TABLE "reembolsos_km" DROP COLUMN "data_pagamento";


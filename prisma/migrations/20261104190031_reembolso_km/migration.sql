-- CreateEnum
CREATE TYPE "StatusReembolsoKm" AS ENUM ('PENDENTE', 'PRE_APROVADO', 'APROVADO', 'PAGO', 'REJEITADO');

-- AlterEnum
ALTER TYPE "Perfil" ADD VALUE 'CONSULTOR';

-- CreateTable
CREATE TABLE "reembolsos_km" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "consultor_id" TEXT NOT NULL,
    "colaborador" TEXT NOT NULL,
    "equipe" TEXT,
    "periodo_inicio" TIMESTAMP(3) NOT NULL,
    "periodo_fim" TIMESTAMP(3) NOT NULL,
    "total_km" DECIMAL(10,3) NOT NULL,
    "total_valor" DECIMAL(14,2) NOT NULL,
    "arquivo_pdf" BYTEA NOT NULL,
    "arquivo_pdf_nome" TEXT NOT NULL,
    "status" "StatusReembolsoKm" NOT NULL DEFAULT 'PENDENTE',
    "comentarios" TEXT,
    "data_solicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_pagamento" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reembolsos_km_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reembolso_km_itens" (
    "id" TEXT NOT NULL,
    "reembolso_km_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tarefa_codigo" TEXT NOT NULL,
    "cliente_partida" TEXT NOT NULL,
    "cliente_chegada" TEXT NOT NULL,
    "km" DECIMAL(10,3) NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "reembolso_km_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reembolso_km_eventos" (
    "id" TEXT NOT NULL,
    "reembolso_km_id" TEXT NOT NULL,
    "tipo" "StatusReembolsoKm" NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "comentario" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reembolso_km_eventos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reembolsos_km" ADD CONSTRAINT "reembolsos_km_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reembolsos_km" ADD CONSTRAINT "reembolsos_km_consultor_id_fkey" FOREIGN KEY ("consultor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reembolso_km_itens" ADD CONSTRAINT "reembolso_km_itens_reembolso_km_id_fkey" FOREIGN KEY ("reembolso_km_id") REFERENCES "reembolsos_km"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reembolso_km_eventos" ADD CONSTRAINT "reembolso_km_eventos_reembolso_km_id_fkey" FOREIGN KEY ("reembolso_km_id") REFERENCES "reembolsos_km"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reembolso_km_eventos" ADD CONSTRAINT "reembolso_km_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

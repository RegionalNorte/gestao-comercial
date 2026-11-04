-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMIN', 'ANALISTA', 'GERENTE_REGIONAL', 'GERENTE_AREA', 'GERENTE_UNIDADE');

-- CreateEnum
CREATE TYPE "Cluster" AS ENUM ('P', 'M', 'G');

-- CreateEnum
CREATE TYPE "TipoVerba" AS ENUM ('VM');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'PAGO');

-- CreateEnum
CREATE TYPE "TipoTransferencia" AS ENUM ('INTRA_AREA', 'ENTRE_AREAS');

-- CreateEnum
CREATE TYPE "StatusTransferencia" AS ENUM ('PENDENTE', 'APROVADA', 'NEGADA');

-- CreateEnum
CREATE TYPE "StatusSolicitacaoExtra" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "StatusDecisao" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "cluster" "Cluster",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "abreviacao" TEXT,
    "cod_fornecedor" TEXT,
    "conta_contabil" TEXT,
    "tipo_verba" "TipoVerba" NOT NULL DEFAULT 'VM',
    "bv_pct" DECIMAL(6,4),
    "taxa_pct" DECIMAL(6,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_unidades" (
    "usuario_id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,

    CONSTRAINT "usuario_unidades_pkey" PRIMARY KEY ("usuario_id","unidade_id")
);

-- CreateTable
CREATE TABLE "usuario_areas" (
    "usuario_id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,

    CONSTRAINT "usuario_areas_pkey" PRIMARY KEY ("usuario_id","area_id")
);

-- CreateTable
CREATE TABLE "ciclos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data_inicio" TIMESTAMP(3),
    "data_fim" TIMESTAMP(3),
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ciclos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "ciclo_id" TEXT NOT NULL,
    "fornecedor_id" TEXT,
    "meta_bu_presencial" INTEGER,
    "meta_bu_digital" INTEGER,
    "verba_orcada" DECIMAL(14,2) NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "ciclo_id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "fornecedor_id" TEXT NOT NULL,
    "servico" TEXT NOT NULL,
    "valor_liquido" DECIMAL(14,2) NOT NULL,
    "bv_pct" DECIMAL(6,4) NOT NULL,
    "taxa_pct" DECIMAL(6,4) NOT NULL,
    "bv" DECIMAL(14,2) NOT NULL,
    "taxa" DECIMAL(14,2) NOT NULL,
    "valor_bruto" DECIMAL(14,2) NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'PENDENTE',
    "solicitado_por_id" TEXT NOT NULL,
    "analisado_por_id" TEXT,
    "data_solicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_analise" TIMESTAMP(3),
    "data_pagamento" TIMESTAMP(3),
    "comentarios" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencias_saldo" (
    "id" TEXT NOT NULL,
    "ciclo_id" TEXT NOT NULL,
    "unidade_origem_id" TEXT NOT NULL,
    "unidade_destino_id" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "tipo" "TipoTransferencia" NOT NULL,
    "status" "StatusTransferencia" NOT NULL DEFAULT 'APROVADA',
    "solicitado_por_id" TEXT NOT NULL,
    "aprovado_por_id" TEXT,
    "data_solicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_decisao" TIMESTAMP(3),
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transferencias_saldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_verba_extra" (
    "id" TEXT NOT NULL,
    "ciclo_id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "solicitado_por_id" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" "StatusSolicitacaoExtra" NOT NULL DEFAULT 'PENDENTE',
    "analisado_por_id" TEXT,
    "data_solicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_analise" TIMESTAMP(3),
    "comentario_analista" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_verba_extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_planejamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_planejamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planejamentos" (
    "id" TEXT NOT NULL,
    "ciclo_id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "tipo_planejamento_id" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "solicitado_por_id" TEXT NOT NULL,
    "status_geral" "StatusDecisao" NOT NULL DEFAULT 'PENDENTE',
    "decisao_area_status" "StatusDecisao" NOT NULL DEFAULT 'PENDENTE',
    "decisao_area_por_id" TEXT,
    "decisao_area_em" TIMESTAMP(3),
    "decisao_regional_status" "StatusDecisao" NOT NULL DEFAULT 'PENDENTE',
    "decisao_regional_por_id" TEXT,
    "decisao_regional_em" TIMESTAMP(3),
    "data_solicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planejamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "areas_nome_key" ON "areas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_nome_area_id_key" ON "unidades"("nome", "area_id");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_nome_key" ON "fornecedores"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ciclos_nome_key" ON "ciclos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "metas_unidade_id_ciclo_id_key" ON "metas"("unidade_id", "ciclo_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_planejamento_nome_key" ON "tipos_planejamento"("nome");

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_unidades" ADD CONSTRAINT "usuario_unidades_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_unidades" ADD CONSTRAINT "usuario_unidades_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_areas" ADD CONSTRAINT "usuario_areas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_areas" ADD CONSTRAINT "usuario_areas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "ciclos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "ciclos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_analisado_por_id_fkey" FOREIGN KEY ("analisado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_saldo" ADD CONSTRAINT "transferencias_saldo_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "ciclos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_saldo" ADD CONSTRAINT "transferencias_saldo_unidade_origem_id_fkey" FOREIGN KEY ("unidade_origem_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_saldo" ADD CONSTRAINT "transferencias_saldo_unidade_destino_id_fkey" FOREIGN KEY ("unidade_destino_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_saldo" ADD CONSTRAINT "transferencias_saldo_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_saldo" ADD CONSTRAINT "transferencias_saldo_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_verba_extra" ADD CONSTRAINT "solicitacoes_verba_extra_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "ciclos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_verba_extra" ADD CONSTRAINT "solicitacoes_verba_extra_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_verba_extra" ADD CONSTRAINT "solicitacoes_verba_extra_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_verba_extra" ADD CONSTRAINT "solicitacoes_verba_extra_analisado_por_id_fkey" FOREIGN KEY ("analisado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamentos" ADD CONSTRAINT "planejamentos_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "ciclos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamentos" ADD CONSTRAINT "planejamentos_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamentos" ADD CONSTRAINT "planejamentos_tipo_planejamento_id_fkey" FOREIGN KEY ("tipo_planejamento_id") REFERENCES "tipos_planejamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamentos" ADD CONSTRAINT "planejamentos_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamentos" ADD CONSTRAINT "planejamentos_decisao_area_por_id_fkey" FOREIGN KEY ("decisao_area_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamentos" ADD CONSTRAINT "planejamentos_decisao_regional_por_id_fkey" FOREIGN KEY ("decisao_regional_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

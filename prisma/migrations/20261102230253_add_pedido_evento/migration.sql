-- CreateTable
CREATE TABLE "pedido_eventos" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "tipo" "StatusPedido" NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "comentario" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedido_eventos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pedido_eventos" ADD CONSTRAINT "pedido_eventos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_eventos" ADD CONSTRAINT "pedido_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

import { prisma } from "./prisma";

// Fórmula única de saldo disponível de uma unidade num ciclo: a verba orçada (valor
// puro, sem markup — ver Meta.verbaOrcada), menos o bruto dos pedidos já pagos OU ainda
// pendentes/aprovados (um pedido pendente já reserva o saldo — senão duas unidades
// conseguiriam pedir além do orçamento e só estourar na hora do pagamento), menos o que
// saiu em transferências aprovadas, mais o que entrou em transferências aprovadas, mais
// a verba extra aprovada (fora do orçamento original, mas que já soma ao saldo gastável
// — ver SolicitacaoVerbaExtra), menos planejamentos ainda não rejeitados (reserva
// preventiva de campanha/ação antes de virar pedido — já reserva desde PENDENTE, pelo
// mesmo motivo do pedido pendente acima; ver Planejamento.statusGeral).
// Usada tanto para validar novos pedidos/transferências quanto para exibir o saldo em
// Metas e Valores — precisa ser a mesma conta em todo lugar.
export async function calcularSaldoDisponivel(unidadeId: string, cicloId: string): Promise<number> {
  const meta = await prisma.meta.findUnique({ where: { unidadeId_cicloId: { unidadeId, cicloId } } });
  if (!meta) return 0;

  const [pagos, saidas, entradas, extra, planejado] = await Promise.all([
    prisma.pedido.aggregate({
      where: { unidadeId, cicloId, status: { in: ["PENDENTE", "PRE_APROVADO", "APROVADO", "PAGO"] } },
      _sum: { valorBruto: true },
    }),
    prisma.transferenciaSaldo.aggregate({
      where: { unidadeOrigemId: unidadeId, cicloId, status: "APROVADA" },
      _sum: { valor: true },
    }),
    prisma.transferenciaSaldo.aggregate({
      where: { unidadeDestinoId: unidadeId, cicloId, status: "APROVADA" },
      _sum: { valor: true },
    }),
    prisma.solicitacaoVerbaExtra.aggregate({
      where: { unidadeId, cicloId, status: "APROVADO" },
      _sum: { valor: true },
    }),
    prisma.planejamento.aggregate({
      where: { unidadeId, cicloId, statusGeral: { in: ["PENDENTE", "APROVADO"] } },
      _sum: { valor: true },
    }),
  ]);

  return (
    Number(meta.verbaOrcada) -
    Number(pagos._sum.valorBruto ?? 0) -
    Number(saidas._sum.valor ?? 0) +
    Number(entradas._sum.valor ?? 0) +
    Number(extra._sum.valor ?? 0) -
    Number(planejado._sum.valor ?? 0)
  );
}

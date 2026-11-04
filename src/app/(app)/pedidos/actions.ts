"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { calcularSaldoDisponivel } from "@/lib/saldo";
import type { StatusPedido } from "../../../generated/prisma";

export type CicloOpcao = { id: string; nome: string };

export type FormState =
  | { error: string; values: Record<string, string>; ciclosAlternativos?: CicloOpcao[] }
  | undefined;

// React reseta os campos não controlados do <form> depois que a action roda, mesmo
// em caso de erro. Devolvemos o que o usuário digitou para o form repopular os
// campos via defaultValue (ver useActionState + key em PedidoForm.tsx).
function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string" && !(key in out)) out[key] = val;
  }
  return out;
}

// Fórmula confirmada com o Analista: BV incide sobre o líquido; a Taxa incide sobre
// líquido + BV; o bruto é a soma dos três. Os %s são herdados do fornecedor configurado
// na Meta da unidade/ciclo. Esse cálculo é controle do Analista (feito em Metas e
// Valores) — o Gerente de Unidade não vê o detalhamento, só se o pedido coube no saldo.
function calcularValores(valorLiquido: number, bvPct: number, taxaPct: number) {
  const bv = valorLiquido * bvPct;
  const taxa = (valorLiquido + bv) * taxaPct;
  const valorBruto = valorLiquido + bv + taxa;
  return { bv, taxa, valorBruto };
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseData(raw: string): Date | null {
  if (!raw) return null;
  return new Date(`${raw}T00:00:00.000Z`);
}

function formatDataBr(d: Date): string {
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Ciclos abertos em que a unidade tem fornecedor/BV%/Taxa% configurados em Metas e
// Valores — são os únicos que fazem sentido oferecer quando a data não resolve o ciclo
// sozinha (sem ciclo pra data, ciclo fechado, ou sem saldo).
async function buscarCiclosAlternativos(unidadeId: string): Promise<CicloOpcao[]> {
  const metas = await prisma.meta.findMany({
    where: { unidadeId, ciclo: { status: "Aberto" } },
    include: { ciclo: true, fornecedor: true },
  });
  return metas
    .filter((m) => m.fornecedor && m.fornecedor.bvPct !== null && m.fornecedor.taxaPct !== null)
    .map((m) => ({ id: m.ciclo.id, nome: m.ciclo.nome }));
}

export async function criarPedido(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "GERENTE_UNIDADE", "GERENTE_COMERCIAL"]);
  const values = echoValues(formData);

  const unidadeId = String(formData.get("unidadeId") ?? "").trim();
  if (!unidadeId) return { error: "Selecione a unidade.", values };

  const servico = String(formData.get("servico") ?? "").trim();
  if (!servico) return { error: "Informe o serviço.", values };

  const valorLiquidoRaw = String(formData.get("valorLiquido") ?? "").trim().replace(",", ".");
  const valorLiquido = Number(valorLiquidoRaw);
  if (!valorLiquidoRaw || Number.isNaN(valorLiquido) || valorLiquido <= 0) {
    return { error: "Informe um valor líquido válido (maior que zero).", values };
  }

  const dataDesejada = parseData(String(formData.get("dataDesejada") ?? "").trim());
  if (!dataDesejada) return { error: "Informe a data desejada de pagamento.", values };

  const cicloIdManual = String(formData.get("cicloIdManual") ?? "").trim() || null;

  if (session.perfil === "GERENTE_UNIDADE" || session.perfil === "GERENTE_COMERCIAL") {
    const vinculo = await prisma.usuarioUnidade.findUnique({
      where: { usuarioId_unidadeId: { usuarioId: session.sub, unidadeId } },
    });
    if (!vinculo) return { error: "Você não gerencia essa unidade.", values };
  }

  // O ciclo não é escolhido livremente: por padrão é o ciclo cujo período cobre a data
  // desejada de pagamento. Só quando isso não resolve (sem ciclo pra data, ciclo fechado
  // ou sem saldo) é que aparece a opção de escolher manualmente entre os ciclos abertos
  // com orçamento disponível para essa unidade (cicloIdManual).
  const ciclo = cicloIdManual
    ? await prisma.ciclo.findUnique({ where: { id: cicloIdManual } })
    : await prisma.ciclo.findFirst({ where: { dataInicio: { lte: dataDesejada }, dataFim: { gte: dataDesejada } } });

  if (!ciclo) {
    const ciclosAlternativos = await buscarCiclosAlternativos(unidadeId);
    return {
      error: cicloIdManual
        ? "Ciclo não encontrado."
        : "Nenhum ciclo cadastrado cobre essa data. Escolha um ciclo na lista abaixo.",
      values,
      ciclosAlternativos,
    };
  }
  if (ciclo.status !== "Aberto") {
    const ciclosAlternativos = await buscarCiclosAlternativos(unidadeId);
    return {
      error: `O ciclo ${ciclo.nome} está fechado para novos pedidos. Escolha outro ciclo.`,
      values,
      ciclosAlternativos,
    };
  }

  const meta = await prisma.meta.findUnique({
    where: { unidadeId_cicloId: { unidadeId, cicloId: ciclo.id } },
    include: { fornecedor: true },
  });
  if (!meta || !meta.fornecedor || meta.fornecedor.bvPct === null || meta.fornecedor.taxaPct === null) {
    const ciclosAlternativos = await buscarCiclosAlternativos(unidadeId);
    return {
      error: `Nenhum fornecedor configurado para esta unidade no ciclo ${ciclo.nome}. Peça ao Analista para configurar em Metas e Valores, ou escolha outro ciclo.`,
      values,
      ciclosAlternativos,
    };
  }

  const bvPct = Number(meta.fornecedor.bvPct);
  const taxaPct = Number(meta.fornecedor.taxaPct);
  const { bv, taxa, valorBruto } = calcularValores(valorLiquido, bvPct, taxaPct);

  const saldoDisponivel = await calcularSaldoDisponivel(unidadeId, ciclo.id);
  if (valorBruto > saldoDisponivel) {
    const ciclosAlternativos = await buscarCiclosAlternativos(unidadeId);
    return {
      error: `Saldo insuficiente no ciclo ${ciclo.nome} para esta unidade (disponível: ${formatMoeda(saldoDisponivel)}). Reduza o valor ou escolha outro ciclo.`,
      values,
      ciclosAlternativos,
    };
  }

  // A data cair dentro do período do ciclo (ciclo "vigente" pra essa data) é o caso
  // normal. Quando o Gerente de Unidade escolheu o ciclo manualmente — porque a data
  // desejada cai fora do período de todos os ciclos cadastrados — deixamos isso
  // explícito no histórico, já que não é óbvio pra quem revisa depois.
  const dataDentroDoCiclo =
    !!ciclo.dataInicio && !!ciclo.dataFim && ciclo.dataInicio <= dataDesejada && dataDesejada <= ciclo.dataFim;
  const comentarioSolicitacao = dataDentroDoCiclo
    ? `Retirado do valor orçado do ciclo vigente (${ciclo.nome}).`
    : `Solicitado para a data ${formatDataBr(dataDesejada)} — retirado do ciclo ${ciclo.nome}, escolhido manualmente por estar fora do período de todos os ciclos cadastrados.`;

  const pedido = await prisma.pedido.create({
    data: {
      cicloId: ciclo.id,
      unidadeId,
      fornecedorId: meta.fornecedor.id,
      servico,
      dataDesejada,
      valorLiquido,
      bvPct,
      taxaPct,
      bv,
      taxa,
      valorBruto,
      solicitadoPorId: session.sub,
    },
  });
  await prisma.pedidoEvento.create({
    data: { pedidoId: pedido.id, tipo: "PENDENTE", usuarioId: session.sub, comentario: comentarioSolicitacao },
  });

  revalidatePath("/pedidos");
}

export async function decidirPedido(
  pedidoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "ANALISTA", "GERENTE_REGIONAL", "GERENTE_AREA"]);
  const values = echoValues(formData);

  const decisao = String(formData.get("decisao") ?? "");
  if (decisao !== "APROVADO" && decisao !== "REJEITADO") {
    return { error: "Decisão inválida.", values };
  }

  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, include: { unidade: true } });
  if (!pedido) return { error: "Pedido não encontrado.", values };

  // Gerente de Área só decide pedidos das unidades da própria área.
  if (session.perfil === "GERENTE_AREA") {
    const areasDoUsuario = await prisma.usuarioArea.findMany({ where: { usuarioId: session.sub } });
    const areaIds = areasDoUsuario.map((a) => a.areaId);
    if (!areaIds.includes(pedido.unidade.areaId)) {
      return { error: "Você só pode decidir pedidos de unidades da sua própria área.", values };
    }
  }

  // Depois de aprovado (e antes de pago), Analista/Gerente Regional ainda têm autonomia
  // pra rejeitar o pedido como checagem final — mas não dá pra aprovar de novo algo já
  // aprovado, nem decidir um pedido já pago ou já rejeitado.
  if (pedido.status === "PAGO" || pedido.status === "REJEITADO") {
    return { error: "Esse pedido já foi pago ou rejeitado e não pode mais ser alterado.", values };
  }
  if (pedido.status === "APROVADO" && decisao !== "REJEITADO") {
    return { error: "Um pedido já aprovado só pode ser rejeitado, não aprovado de novo.", values };
  }

  const comentarios = String(formData.get("comentarios") ?? "").trim() || null;
  if (decisao === "REJEITADO" && !comentarios) {
    return { error: "Informe uma justificativa nas observações para rejeitar o pedido.", values };
  }

  await prisma.$transaction([
    prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        status: decisao as StatusPedido,
        analisadoPorId: session.sub,
        dataAnalise: new Date(),
        comentarios,
      },
    }),
    prisma.pedidoEvento.create({
      data: { pedidoId, tipo: decisao as StatusPedido, usuarioId: session.sub, comentario: comentarios },
    }),
  ]);

  revalidatePath("/pedidos");
}

export async function marcarComoPago(pedidoId: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);

  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) return { error: "Pedido não encontrado.", values };
  if (pedido.status !== "APROVADO") return { error: "Só é possível marcar como pago um pedido aprovado.", values };

  await prisma.$transaction([
    prisma.pedido.update({
      where: { id: pedidoId },
      data: { status: "PAGO", dataPagamento: new Date() },
    }),
    prisma.pedidoEvento.create({
      data: { pedidoId, tipo: "PAGO", usuarioId: session.sub },
    }),
  ]);

  revalidatePath("/pedidos");
}

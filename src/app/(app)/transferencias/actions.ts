"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { calcularSaldoDisponivel } from "@/lib/saldo";
import type { StatusTransferencia, TipoTransferencia } from "../../../generated/prisma";

export type FormState = { error: string; values: Record<string, string> } | undefined;

function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string" && !(key in out)) out[key] = val;
  }
  return out;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Transferência intra-área (mesma área da origem e do destino) é ação direta do
// Gerente de Área — nasce já APROVADA. Entre áreas nasce PENDENTE até o Gerente de Área
// da unidade doadora (origem) decidir. Admin tem autoridade plena e aprova de imediato
// em qualquer caso, já que não existe "doador" acima dele para decidir.
export async function criarTransferencia(
  cicloId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "GERENTE_AREA"]);
  const values = echoValues(formData);

  const unidadeOrigemId = String(formData.get("unidadeOrigemId") ?? "").trim();
  const unidadeDestinoId = String(formData.get("unidadeDestinoId") ?? "").trim();
  if (!unidadeOrigemId) return { error: "Selecione a unidade de origem.", values };
  if (!unidadeDestinoId) return { error: "Selecione a unidade de destino.", values };
  if (unidadeOrigemId === unidadeDestinoId) {
    return { error: "A unidade de origem não pode ser a mesma que a de destino.", values };
  }

  const valorRaw = String(formData.get("valor") ?? "").trim().replace(",", ".");
  const valor = Number(valorRaw);
  if (!valorRaw || Number.isNaN(valor) || valor <= 0) {
    return { error: "Informe um valor válido (maior que zero).", values };
  }

  const observacao = String(formData.get("observacao") ?? "").trim() || null;

  const [unidadeOrigem, unidadeDestino] = await Promise.all([
    prisma.unidade.findUnique({ where: { id: unidadeOrigemId } }),
    prisma.unidade.findUnique({ where: { id: unidadeDestinoId } }),
  ]);
  if (!unidadeOrigem || !unidadeDestino) return { error: "Unidade não encontrada.", values };

  if (session.perfil === "GERENTE_AREA") {
    const areasDoUsuario = await prisma.usuarioArea.findMany({ where: { usuarioId: session.sub } });
    const areaIds = areasDoUsuario.map((a) => a.areaId);
    if (!areaIds.includes(unidadeDestino.areaId)) {
      return { error: "Você só pode solicitar transferência para uma unidade da sua própria área.", values };
    }
  }

  const metaDestino = await prisma.meta.findUnique({
    where: { unidadeId_cicloId: { unidadeId: unidadeDestinoId, cicloId } },
  });
  if (!metaDestino) {
    return {
      error:
        "A unidade de destino ainda não tem meta/orçamento definido neste ciclo. Peça ao Analista para criar em Metas e Valores primeiro.",
      values,
    };
  }

  const saldoOrigem = await calcularSaldoDisponivel(unidadeOrigemId, cicloId);
  if (valor > saldoOrigem) {
    return {
      error: `Saldo insuficiente na unidade de origem (disponível: ${formatMoeda(saldoOrigem)}).`,
      values,
    };
  }

  const mesmaArea = unidadeOrigem.areaId === unidadeDestino.areaId;
  const aprovaDeImediato = session.perfil === "ADMIN" || mesmaArea;
  const tipo: TipoTransferencia = mesmaArea ? "INTRA_AREA" : "ENTRE_AREAS";

  await prisma.transferenciaSaldo.create({
    data: {
      cicloId,
      unidadeOrigemId,
      unidadeDestinoId,
      valor,
      tipo,
      status: (aprovaDeImediato ? "APROVADA" : "PENDENTE") as StatusTransferencia,
      solicitadoPorId: session.sub,
      aprovadoPorId: aprovaDeImediato ? session.sub : null,
      dataDecisao: aprovaDeImediato ? new Date() : null,
      observacao,
    },
  });

  revalidatePath("/transferencias");
  revalidatePath("/metas-e-valores");
}

export async function decidirTransferencia(
  transferenciaId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "GERENTE_AREA"]);
  const values = echoValues(formData);

  const decisao = String(formData.get("decisao") ?? "");
  if (decisao !== "APROVADA" && decisao !== "NEGADA") return { error: "Decisão inválida.", values };

  const transferencia = await prisma.transferenciaSaldo.findUnique({
    where: { id: transferenciaId },
    include: { unidadeOrigem: true },
  });
  if (!transferencia) return { error: "Transferência não encontrada.", values };
  if (transferencia.status !== "PENDENTE") {
    return { error: "Essa transferência já foi decidida e não pode mais ser alterada.", values };
  }

  // Só o Gerente de Área da unidade doadora (origem) decide uma transferência entre
  // áreas — é ele quem está "cedendo" o saldo. Admin decide qualquer uma.
  if (session.perfil === "GERENTE_AREA") {
    const areasDoUsuario = await prisma.usuarioArea.findMany({ where: { usuarioId: session.sub } });
    const areaIds = areasDoUsuario.map((a) => a.areaId);
    if (!areaIds.includes(transferencia.unidadeOrigem.areaId)) {
      return { error: "Só o Gerente de Área da unidade doadora pode decidir esta transferência.", values };
    }
  }

  const comentario = String(formData.get("observacao") ?? "").trim() || null;
  if (decisao === "NEGADA" && !comentario) {
    return { error: "Informe uma justificativa para negar a transferência.", values };
  }

  if (decisao === "APROVADA") {
    const saldoOrigem = await calcularSaldoDisponivel(transferencia.unidadeOrigemId, transferencia.cicloId);
    if (Number(transferencia.valor) > saldoOrigem) {
      return {
        error: `Saldo insuficiente na unidade de origem para aprovar agora (disponível: ${formatMoeda(saldoOrigem)}).`,
        values,
      };
    }
  }

  let observacao = transferencia.observacao;
  if (comentario) {
    const rotulo = decisao === "APROVADA" ? "Aprovada" : "Negada";
    observacao = observacao ? `${observacao} | ${rotulo}: ${comentario}` : `${rotulo}: ${comentario}`;
  }

  await prisma.transferenciaSaldo.update({
    where: { id: transferenciaId },
    data: {
      status: decisao as StatusTransferencia,
      aprovadoPorId: session.sub,
      dataDecisao: new Date(),
      observacao,
    },
  });

  revalidatePath("/transferencias");
  revalidatePath("/metas-e-valores");
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import type { StatusSolicitacaoExtra } from "../../../generated/prisma";

export type FormState = { error: string; values: Record<string, string> } | undefined;

function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string" && !(key in out)) out[key] = val;
  }
  return out;
}

// Solicitação do Gerente de Área por verba fora do orçamento já definido (ex.: brindes,
// festas), em nome de uma unidade da sua área. Quem decide é sempre o Analista (ou
// Admin) — nasce PENDENTE e só soma ao saldo da unidade quando aprovada; o valor fica
// rastreável separadamente do orçado original (ver Meta.verbaOrcada), nunca misturado nele.
export async function criarSolicitacaoExtra(
  cicloId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "GERENTE_AREA"]);
  const values = echoValues(formData);

  const unidadeId = String(formData.get("unidadeId") ?? "").trim();
  if (!unidadeId) return { error: "Selecione a unidade.", values };

  const valorRaw = String(formData.get("valor") ?? "").trim().replace(",", ".");
  const valor = Number(valorRaw);
  if (!valorRaw || Number.isNaN(valor) || valor <= 0) {
    return { error: "Informe um valor válido (maior que zero).", values };
  }

  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) return { error: "Informe o motivo da solicitação.", values };

  const unidade = await prisma.unidade.findUnique({ where: { id: unidadeId } });
  if (!unidade) return { error: "Unidade não encontrada.", values };

  if (session.perfil === "GERENTE_AREA") {
    const vinculos = await prisma.usuarioArea.findMany({ where: { usuarioId: session.sub } });
    const areaIds = vinculos.map((v) => v.areaId);
    if (!areaIds.includes(unidade.areaId)) {
      return { error: "Você só pode solicitar verba extra para uma unidade da sua própria área.", values };
    }
  }

  const meta = await prisma.meta.findUnique({ where: { unidadeId_cicloId: { unidadeId, cicloId } } });
  if (!meta) {
    return {
      error:
        "Essa unidade ainda não tem meta/orçamento definido neste ciclo. Peça ao Analista para criar em Metas e Valores primeiro.",
      values,
    };
  }

  await prisma.solicitacaoVerbaExtra.create({
    data: { cicloId, unidadeId, valor, motivo, solicitadoPorId: session.sub },
  });

  revalidatePath("/verba-extra");
}

export async function decidirSolicitacaoExtra(
  solicitacaoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);

  const decisao = String(formData.get("decisao") ?? "");
  if (decisao !== "APROVADO" && decisao !== "REJEITADO") return { error: "Decisão inválida.", values };

  const solicitacao = await prisma.solicitacaoVerbaExtra.findUnique({ where: { id: solicitacaoId } });
  if (!solicitacao) return { error: "Solicitação não encontrada.", values };
  if (solicitacao.status !== "PENDENTE") {
    return { error: "Essa solicitação já foi decidida e não pode mais ser alterada.", values };
  }

  const comentarioAnalista = String(formData.get("comentarioAnalista") ?? "").trim() || null;
  if (decisao === "REJEITADO" && !comentarioAnalista) {
    return { error: "Informe uma justificativa para rejeitar a solicitação.", values };
  }

  await prisma.solicitacaoVerbaExtra.update({
    where: { id: solicitacaoId },
    data: {
      status: decisao as StatusSolicitacaoExtra,
      analisadoPorId: session.sub,
      dataAnalise: new Date(),
      comentarioAnalista,
    },
  });

  revalidatePath("/verba-extra");
  revalidatePath("/metas-e-valores");
}

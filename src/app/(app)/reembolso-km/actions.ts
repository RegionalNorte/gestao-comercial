"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { parseRelatorioKm } from "@/lib/reembolsoKmPdf";
import type { StatusReembolsoKm } from "../../../generated/prisma";

export type FormState = { error?: string; aviso?: string; values?: Record<string, string> } | undefined;

const STATUS_LABEL_PT: Record<StatusReembolsoKm, string> = {
  PENDENTE: "pendente",
  PRE_APROVADO: "pré-aprovado",
  APROVADO: "aprovado",
  REJEITADO: "rejeitado",
};

// React reseta os campos não controlados do <form> depois que a action roda, mesmo em
// caso de erro. Devolvemos o que o usuário digitou para o form repopular via
// defaultValue (ver useActionState + key nos forms deste módulo).
function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string" && !(key in out)) out[key] = val;
  }
  return out;
}

export async function criarReembolsoKm(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePerfil(["CONSULTOR"]);
  const values = echoValues(formData);

  const unidadeId = String(formData.get("unidadeId") ?? "").trim();
  if (!unidadeId) return { error: "Selecione a unidade.", values };

  const vinculo = await prisma.usuarioUnidade.findUnique({
    where: { usuarioId_unidadeId: { usuarioId: session.sub, unidadeId } },
  });
  if (!vinculo) return { error: "Você não está vinculado a essa unidade.", values };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Anexe o PDF do relatório de Km Rodado.", values };
  }
  if (!arquivo.name.toLowerCase().endsWith(".pdf")) {
    return { error: "O arquivo precisa ser um PDF.", values };
  }

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const resultado = await parseRelatorioKm(bytes);
  if ("error" in resultado) return { error: resultado.error, values };

  const { dados } = resultado;

  // Conflito de período: busca solicitações do mesmo consultor que não foram rejeitadas e
  // cujo intervalo cruza com o período do PDF enviado agora. Dias que já caem dentro de
  // alguma delas ficam marcados como "ignorado" — não contam no total nem no período desta
  // solicitação, mas o item é salvo para conferência (aparece em outra cor no detalhe).
  const conflitos = await prisma.reembolsoKm.findMany({
    where: {
      consultorId: session.sub,
      status: { not: "REJEITADO" },
      periodoInicio: { lte: dados.periodoFim },
      periodoFim: { gte: dados.periodoInicio },
    },
    select: { periodoInicio: true, periodoFim: true, status: true },
  });

  const itensComFlag = dados.itens.map((item) => ({
    ...item,
    ignorado: conflitos.some((c) => item.data >= c.periodoInicio && item.data <= c.periodoFim),
  }));

  const itensValidos = itensComFlag.filter((item) => !item.ignorado);

  if (itensValidos.length === 0) {
    const statusConflitantes = Array.from(new Set(conflitos.map((c) => STATUS_LABEL_PT[c.status]))).join(", ");
    return {
      error: `Já existe uma solicitação para esse período (status: ${statusConflitantes}).`,
      values,
    };
  }

  const totalKmValido = Math.round(itensValidos.reduce((soma, item) => soma + item.km, 0) * 1000) / 1000;
  const totalValorValido = Math.round(itensValidos.reduce((soma, item) => soma + item.valor, 0) * 100) / 100;
  const periodoInicioValido = new Date(Math.min(...itensValidos.map((item) => item.data.getTime())));
  const periodoFimValido = new Date(Math.max(...itensValidos.map((item) => item.data.getTime())));
  const quantidadeIgnorados = itensComFlag.length - itensValidos.length;

  const reembolso = await prisma.reembolsoKm.create({
    data: {
      unidadeId,
      consultorId: session.sub,
      colaborador: dados.colaborador,
      equipe: dados.equipe,
      periodoInicio: periodoInicioValido,
      periodoFim: periodoFimValido,
      totalKm: totalKmValido,
      totalValor: totalValorValido,
      arquivoPdf: Buffer.from(bytes),
      arquivoPdfNome: arquivo.name,
      itens: {
        create: itensComFlag.map((item) => ({
          data: item.data,
          tarefaCodigo: item.tarefaCodigo,
          clientePartida: item.clientePartida,
          clienteChegada: item.clienteChegada,
          km: item.km,
          valor: item.valor,
          ignorado: item.ignorado,
        })),
      },
    },
  });

  await prisma.reembolsoKmEvento.create({
    data: { reembolsoKmId: reembolso.id, tipo: "PENDENTE", usuarioId: session.sub },
  });

  revalidatePath("/reembolso-km");

  if (quantidadeIgnorados > 0) {
    return {
      aviso: `${quantidadeIgnorados} dia(s) do PDF já tinham solicitação em andamento ou aprovada e não entraram nesta solicitação — veja em destaque no detalhamento por trecho.`,
    };
  }
}

// Gerente Comercial/Unidade (pares, mesma regra de paridade usada no resto do sistema) da
// unidade do consultor: pré-aprova ou rejeita.
export async function decidirComercial(
  reembolsoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "GERENTE_COMERCIAL", "GERENTE_UNIDADE"]);
  const values = echoValues(formData);

  const reembolso = await prisma.reembolsoKm.findUnique({ where: { id: reembolsoId } });
  if (!reembolso) return { error: "Reembolso não encontrado.", values };

  if (session.perfil === "GERENTE_COMERCIAL" || session.perfil === "GERENTE_UNIDADE") {
    const vinculo = await prisma.usuarioUnidade.findUnique({
      where: { usuarioId_unidadeId: { usuarioId: session.sub, unidadeId: reembolso.unidadeId } },
    });
    if (!vinculo) return { error: "Você não gerencia a unidade deste consultor.", values };
  }

  const decisao = String(formData.get("decisao") ?? "");
  if (decisao !== "APROVADO" && decisao !== "REJEITADO") return { error: "Decisão inválida.", values };
  if (reembolso.status !== "PENDENTE") {
    return { error: "Esse reembolso já foi decidido nessa etapa.", values };
  }

  const comentarios = String(formData.get("comentarios") ?? "").trim() || null;
  if (decisao === "REJEITADO" && !comentarios) {
    return { error: "Informe uma justificativa nas observações para rejeitar.", values };
  }

  const novoStatus: StatusReembolsoKm = decisao === "APROVADO" ? "PRE_APROVADO" : "REJEITADO";

  await prisma.$transaction([
    prisma.reembolsoKm.update({ where: { id: reembolsoId }, data: { status: novoStatus, comentarios } }),
    prisma.reembolsoKmEvento.create({
      data: { reembolsoKmId: reembolsoId, tipo: novoStatus, usuarioId: session.sub, comentario: comentarios },
    }),
  ]);

  revalidatePath("/reembolso-km");
}

// Gerente Regional: aprova ou rejeita, depois da pré-aprovação. Decisão final do fluxo —
// o Analista não participa; uma vez aprovado, o valor cai na conta do consultor fora do sistema.
export async function decidirRegional(
  reembolsoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "GERENTE_REGIONAL"]);
  const values = echoValues(formData);

  const decisao = String(formData.get("decisao") ?? "");
  if (decisao !== "APROVADO" && decisao !== "REJEITADO") return { error: "Decisão inválida.", values };

  const reembolso = await prisma.reembolsoKm.findUnique({ where: { id: reembolsoId } });
  if (!reembolso) return { error: "Reembolso não encontrado.", values };
  if (reembolso.status !== "PRE_APROVADO") {
    return { error: "Esse reembolso ainda não está pré-aprovado.", values };
  }

  const comentarios = String(formData.get("comentarios") ?? "").trim() || null;
  if (decisao === "REJEITADO" && !comentarios) {
    return { error: "Informe uma justificativa nas observações para rejeitar.", values };
  }

  const novoStatus: StatusReembolsoKm = decisao === "APROVADO" ? "APROVADO" : "REJEITADO";

  await prisma.$transaction([
    prisma.reembolsoKm.update({ where: { id: reembolsoId }, data: { status: novoStatus, comentarios } }),
    prisma.reembolsoKmEvento.create({
      data: { reembolsoKmId: reembolsoId, tipo: novoStatus, usuarioId: session.sub, comentario: comentarios },
    }),
  ]);

  revalidatePath("/reembolso-km");
}

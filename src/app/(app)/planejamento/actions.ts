"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import type { StatusDecisao } from "@/generated/prisma";

export type FormState = { error: string; values: Record<string, string> } | undefined;

function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string" && !(key in out)) out[key] = val;
  }
  return out;
}

// Criado pelo Gerente de Unidade para uma campanha/ação (ex.: ENEM, Viva Estácio) num
// ciclo (o já selecionado na tela). Nasce com as duas decisões PENDENTE — só fica
// APROVADO (reservando o valor no saldo, ver calcularSaldoDisponivel) quando Gerente de
// Área E Gerente Regional aprovarem; qualquer rejeição de um dos dois já encerra.
export async function criarPlanejamento(
  cicloId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "GERENTE_UNIDADE", "GERENTE_COMERCIAL"]);
  const values = echoValues(formData);

  const unidadeId = String(formData.get("unidadeId") ?? "").trim();
  if (!unidadeId) return { error: "Selecione a unidade.", values };

  const tipoPlanejamentoId = String(formData.get("tipoPlanejamentoId") ?? "").trim();
  if (!tipoPlanejamentoId) return { error: "Selecione o tipo de planejamento.", values };

  const valorRaw = String(formData.get("valor") ?? "").trim().replace(",", ".");
  const valor = Number(valorRaw);
  if (!valorRaw || Number.isNaN(valor) || valor <= 0) {
    return { error: "Informe um valor válido (maior que zero).", values };
  }

  const observacao = String(formData.get("observacao") ?? "").trim() || null;

  const ciclo = await prisma.ciclo.findUnique({ where: { id: cicloId } });
  if (!ciclo || !ciclo.nome.trim().endsWith(".2")) {
    return { error: "Planejamento só pode ser criado para um ciclo do segundo semestre (ex.: 27.2).", values };
  }

  if (session.perfil === "GERENTE_UNIDADE" || session.perfil === "GERENTE_COMERCIAL") {
    const vinculos = await prisma.usuarioUnidade.findMany({ where: { usuarioId: session.sub } });
    const unidadeIds = vinculos.map((v) => v.unidadeId);
    if (!unidadeIds.includes(unidadeId)) {
      return { error: "Você só pode criar planejamento para uma unidade que você gerencia.", values };
    }
  }

  const tipo = await prisma.tipoPlanejamento.findUnique({ where: { id: tipoPlanejamentoId } });
  if (!tipo || !tipo.ativo) return { error: "Tipo de planejamento inválido.", values };

  await prisma.planejamento.create({
    data: { cicloId, unidadeId, tipoPlanejamentoId, valor, observacao, solicitadoPorId: session.sub },
  });

  revalidatePath("/planejamento");
}

// Recalcula o status geral a partir das duas decisões: qualquer rejeição encerra;
// só fica aprovado quando as duas estiverem aprovadas; senão continua pendente.
function statusGeralDe(decisaoArea: StatusDecisao, decisaoRegional: StatusDecisao): StatusDecisao {
  if (decisaoArea === "REJEITADO" || decisaoRegional === "REJEITADO") return "REJEITADO";
  if (decisaoArea === "APROVADO" && decisaoRegional === "APROVADO") return "APROVADO";
  return "PENDENTE";
}

export async function decidirPlanejamentoArea(
  planejamentoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "GERENTE_AREA"]);
  const values = echoValues(formData);

  const decisao = String(formData.get("decisao") ?? "");
  if (decisao !== "APROVADO" && decisao !== "REJEITADO") return { error: "Decisão inválida.", values };

  const planejamento = await prisma.planejamento.findUnique({
    where: { id: planejamentoId },
    include: { unidade: true },
  });
  if (!planejamento) return { error: "Planejamento não encontrado.", values };

  if (session.perfil === "GERENTE_AREA") {
    const vinculos = await prisma.usuarioArea.findMany({ where: { usuarioId: session.sub } });
    const areaIds = vinculos.map((v) => v.areaId);
    if (!areaIds.includes(planejamento.unidade.areaId)) {
      return { error: "Você só pode decidir planejamentos de unidades da sua própria área.", values };
    }
  }
  if (planejamento.decisaoAreaStatus !== "PENDENTE") {
    return { error: "Você já decidiu esse planejamento.", values };
  }
  if (planejamento.statusGeral !== "PENDENTE") {
    return { error: "Esse planejamento já foi encerrado.", values };
  }

  const statusGeral = statusGeralDe(decisao as StatusDecisao, planejamento.decisaoRegionalStatus);

  await prisma.planejamento.update({
    where: { id: planejamentoId },
    data: {
      decisaoAreaStatus: decisao as StatusDecisao,
      decisaoAreaPorId: session.sub,
      decisaoAreaEm: new Date(),
      statusGeral,
    },
  });

  revalidatePath("/planejamento");
  revalidatePath("/metas-e-valores");
}

export async function decidirPlanejamentoRegional(
  planejamentoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "GERENTE_REGIONAL"]);
  const values = echoValues(formData);

  const decisao = String(formData.get("decisao") ?? "");
  if (decisao !== "APROVADO" && decisao !== "REJEITADO") return { error: "Decisão inválida.", values };

  const planejamento = await prisma.planejamento.findUnique({ where: { id: planejamentoId } });
  if (!planejamento) return { error: "Planejamento não encontrado.", values };

  if (planejamento.decisaoRegionalStatus !== "PENDENTE") {
    return { error: "Você já decidiu esse planejamento.", values };
  }
  if (planejamento.statusGeral !== "PENDENTE") {
    return { error: "Esse planejamento já foi encerrado.", values };
  }

  const statusGeral = statusGeralDe(planejamento.decisaoAreaStatus, decisao as StatusDecisao);

  await prisma.planejamento.update({
    where: { id: planejamentoId },
    data: {
      decisaoRegionalStatus: decisao as StatusDecisao,
      decisaoRegionalPorId: session.sub,
      decisaoRegionalEm: new Date(),
      statusGeral,
    },
  });

  revalidatePath("/planejamento");
  revalidatePath("/metas-e-valores");
}

// Catálogo de tipos (ENEM, Viva Estácio...) mantido por Admin/Analista — fixo e
// reutilizado em toda solicitação de planejamento.
export async function criarTipoPlanejamento(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome do tipo.", values };

  const existente = await prisma.tipoPlanejamento.findUnique({ where: { nome } });
  if (existente) return { error: "Já existe um tipo de planejamento com esse nome.", values };

  await prisma.tipoPlanejamento.create({ data: { nome } });

  revalidatePath("/planejamento");
}

// Confirma que a campanha/ação realmente aconteceu — só quem solicitou o planejamento
// pode marcar (ele que sabe se de fato ocorreu), só depois de totalmente aprovado, e só
// dentro do período do ciclo (não dá pra "realizar" uma campanha antes do ciclo começar).
// Vira gasto de fato da unidade em Metas e Valores (sai de "reservado" e entra em "realizado").
export async function marcarPlanejamentoRealizado(planejamentoId: string): Promise<{ error?: string }> {
  const session = await requirePerfil(["ADMIN", "GERENTE_UNIDADE", "GERENTE_COMERCIAL"]);

  const planejamento = await prisma.planejamento.findUnique({
    where: { id: planejamentoId },
    include: { ciclo: true },
  });
  if (!planejamento) return { error: "Planejamento não encontrado." };

  if (session.perfil !== "ADMIN" && planejamento.solicitadoPorId !== session.sub) {
    return { error: "Só quem solicitou o planejamento pode marcar como realizado." };
  }
  if (planejamento.statusGeral !== "APROVADO") {
    return { error: "Só é possível marcar como realizado um planejamento totalmente aprovado." };
  }
  if (planejamento.realizado) {
    return { error: "Esse planejamento já foi marcado como realizado." };
  }
  if (!planejamento.ciclo.dataInicio || new Date() < planejamento.ciclo.dataInicio) {
    return { error: "Só é possível marcar como realizado quando o ciclo já tiver começado." };
  }

  await prisma.planejamento.update({
    where: { id: planejamentoId },
    data: { realizado: true, realizadoPorId: session.sub, realizadoEm: new Date() },
  });

  revalidatePath("/planejamento");
  revalidatePath("/metas-e-valores");
  return {};
}

export async function alternarAtivoTipoPlanejamento(id: string): Promise<{ error?: string }> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const tipo = await prisma.tipoPlanejamento.findUnique({ where: { id } });
  if (!tipo) return { error: "Tipo não encontrado." };

  await prisma.tipoPlanejamento.update({ where: { id }, data: { ativo: !tipo.ativo } });
  revalidatePath("/planejamento");
  return {};
}

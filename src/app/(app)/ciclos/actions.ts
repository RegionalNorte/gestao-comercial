"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";

export type FormState = { error: string; values: Record<string, string> } | undefined;

function parseData(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return new Date(`${raw}T00:00:00.000Z`);
}

// React reseta os campos não controlados do <form> depois que a action roda, mesmo
// em caso de erro. Devolvemos o que o usuário digitou para o form repopular os
// campos via defaultValue (ver useActionState + key em cada *Form.tsx).
function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string" && !(key in out)) out[key] = val;
  }
  return out;
}

export async function criarCiclo(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome do ciclo.", values };

  const existente = await prisma.ciclo.findUnique({ where: { nome } });
  if (existente) return { error: "Já existe um ciclo com esse nome.", values };

  const dataInicio = parseData(formData.get("dataInicio"));
  const dataFim = parseData(formData.get("dataFim"));
  if (dataInicio && dataFim && dataFim < dataInicio) {
    return { error: "A data de fim não pode ser anterior à data de início.", values };
  }

  const status = String(formData.get("status") ?? "Aberto");

  await prisma.ciclo.create({ data: { nome, dataInicio, dataFim, status } });
  revalidatePath("/ciclos");
}

export async function atualizarCiclo(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome do ciclo.", values };

  const duplicado = await prisma.ciclo.findFirst({ where: { nome, NOT: { id } } });
  if (duplicado) return { error: "Já existe um ciclo com esse nome.", values };

  const dataInicio = parseData(formData.get("dataInicio"));
  const dataFim = parseData(formData.get("dataFim"));
  if (dataInicio && dataFim && dataFim < dataInicio) {
    return { error: "A data de fim não pode ser anterior à data de início.", values };
  }

  const status = String(formData.get("status") ?? "Aberto");

  await prisma.ciclo.update({ where: { id }, data: { nome, dataInicio, dataFim, status } });
  revalidatePath("/ciclos");
}

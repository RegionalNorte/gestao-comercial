"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";

export type FormState = { error: string; values: Record<string, string> } | undefined;

// React reseta os campos não controlados do <form> depois que a action roda, mesmo
// em caso de erro. Devolvemos o que o usuário digitou para o form repopular os
// campos via defaultValue (ver useActionState + key em MetaForm.tsx).
function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string" && !(key in out)) out[key] = val;
  }
  return out;
}

function parseInteiro(value: FormDataEntryValue | null): { ok: true; value: number | null } | { ok: false } {
  const raw = String(value ?? "").trim();
  if (!raw) return { ok: true, value: null };

  const numero = Number(raw);
  if (!Number.isInteger(numero) || numero < 0) return { ok: false };

  return { ok: true, value: numero };
}

export async function salvarMeta(
  unidadeId: string,
  cicloId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);

  const verbaRaw = String(formData.get("verbaOrcada") ?? "").trim().replace(",", ".");
  const verbaOrcada = Number(verbaRaw);
  if (!verbaRaw || Number.isNaN(verbaOrcada) || verbaOrcada < 0) {
    return { error: "Informe uma verba orçada válida (maior ou igual a zero).", values };
  }

  const metaBuPresencial = parseInteiro(formData.get("metaBuPresencial"));
  if (!metaBuPresencial.ok) return { error: "Meta BU Presencial precisa ser um número inteiro ≥ 0.", values };

  const metaBuDigital = parseInteiro(formData.get("metaBuDigital"));
  if (!metaBuDigital.ok) return { error: "Meta BU Digital precisa ser um número inteiro ≥ 0.", values };

  const fornecedorIdRaw = String(formData.get("fornecedorId") ?? "").trim();
  const fornecedorId = fornecedorIdRaw || null;

  const observacoesRaw = String(formData.get("observacoes") ?? "").trim();
  const observacoes = observacoesRaw || null;

  await prisma.meta.upsert({
    where: { unidadeId_cicloId: { unidadeId, cicloId } },
    create: {
      unidadeId,
      cicloId,
      fornecedorId,
      metaBuPresencial: metaBuPresencial.value,
      metaBuDigital: metaBuDigital.value,
      verbaOrcada,
      observacoes,
      atualizadoPorId: session.sub,
    },
    update: {
      fornecedorId,
      metaBuPresencial: metaBuPresencial.value,
      metaBuDigital: metaBuDigital.value,
      verbaOrcada,
      observacoes,
      atualizadoPorId: session.sub,
    },
  });

  revalidatePath("/metas-e-valores");
}

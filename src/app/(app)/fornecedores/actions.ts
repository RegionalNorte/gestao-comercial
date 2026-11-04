"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";

export type FormState = { error: string; values: Record<string, string> } | undefined;

function parsePct(value: FormDataEntryValue | null): { ok: true; value: number | null } | { ok: false } {
  const raw = String(value ?? "").trim();
  if (!raw) return { ok: true, value: null };

  const numero = Number(raw.replace(",", "."));
  if (Number.isNaN(numero) || numero < 0 || numero > 100) return { ok: false };

  return { ok: true, value: numero / 100 };
}

function campoOpcional(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  return raw || null;
}

// React reseta os campos não controlados do <form> depois que a action roda, mesmo
// em caso de erro. Devolvemos o que o usuário digitou para o form repopular os
// campos via defaultValue (ver useActionState + key em FornecedorForm.tsx).
function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string" && !(key in out)) out[key] = val;
  }
  return out;
}

export async function criarFornecedor(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome do fornecedor.", values };

  const existente = await prisma.fornecedor.findUnique({ where: { nome } });
  if (existente) return { error: "Já existe um fornecedor com esse nome.", values };

  const bvPct = parsePct(formData.get("bvPct"));
  if (!bvPct.ok) return { error: "BV% precisa ser um número entre 0 e 100.", values };

  const taxaPct = parsePct(formData.get("taxaPct"));
  if (!taxaPct.ok) return { error: "Taxa% precisa ser um número entre 0 e 100.", values };

  await prisma.fornecedor.create({
    data: {
      nome,
      abreviacao: campoOpcional(formData.get("abreviacao")),
      codFornecedor: campoOpcional(formData.get("codFornecedor")),
      contaContabil: campoOpcional(formData.get("contaContabil")),
      bvPct: bvPct.value,
      taxaPct: taxaPct.value,
    },
  });

  revalidatePath("/fornecedores");
}

export async function atualizarFornecedor(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome do fornecedor.", values };

  const duplicado = await prisma.fornecedor.findFirst({ where: { nome, NOT: { id } } });
  if (duplicado) return { error: "Já existe um fornecedor com esse nome.", values };

  const bvPct = parsePct(formData.get("bvPct"));
  if (!bvPct.ok) return { error: "BV% precisa ser um número entre 0 e 100.", values };

  const taxaPct = parsePct(formData.get("taxaPct"));
  if (!taxaPct.ok) return { error: "Taxa% precisa ser um número entre 0 e 100.", values };

  await prisma.fornecedor.update({
    where: { id },
    data: {
      nome,
      abreviacao: campoOpcional(formData.get("abreviacao")),
      codFornecedor: campoOpcional(formData.get("codFornecedor")),
      contaContabil: campoOpcional(formData.get("contaContabil")),
      bvPct: bvPct.value,
      taxaPct: taxaPct.value,
    },
  });

  revalidatePath("/fornecedores");
}

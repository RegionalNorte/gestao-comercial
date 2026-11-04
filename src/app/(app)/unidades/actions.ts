"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { Cluster } from "@/generated/prisma";

export type FormState =
  | {
      error: string;
      values: Record<string, string>;
      gestorIds: string[];
      gestorComercialIds?: string[];
      consultorIds?: string[];
    }
  | undefined;

function parseCluster(value: FormDataEntryValue | null): Cluster | null {
  if (value === "P" || value === "M" || value === "G") return value;
  return null;
}

// React reseta os campos não controlados do <form> depois que a action roda, mesmo
// em caso de erro. Devolvemos o que o usuário digitou/marcou para o form repopular
// via defaultValue/defaultChecked (ver useActionState + key em AreaForm/UnidadeForm).
function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string" && !(key in out)) out[key] = val;
  }
  return out;
}

export async function criarArea(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);
  const gestorIds = formData.getAll("gestores").map(String);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome da área.", values, gestorIds };

  const existente = await prisma.area.findUnique({ where: { nome } });
  if (existente) return { error: "Já existe uma área com esse nome.", values, gestorIds };

  await prisma.area.create({ data: { nome } });
  revalidatePath("/unidades");
}

export async function atualizarArea(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);
  const gestorIds = formData.getAll("gestores").map(String);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome da área.", values, gestorIds };

  const duplicada = await prisma.area.findFirst({ where: { nome, NOT: { id } } });
  if (duplicada) return { error: "Já existe uma área com esse nome.", values, gestorIds };

  await prisma.$transaction([
    prisma.area.update({ where: { id }, data: { nome } }),
    prisma.usuarioArea.deleteMany({ where: { areaId: id } }),
    ...(gestorIds.length
      ? [prisma.usuarioArea.createMany({ data: gestorIds.map((usuarioId) => ({ usuarioId, areaId: id })) })]
      : []),
  ]);

  revalidatePath("/unidades");
}

export async function criarUnidade(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);
  const gestorIds = formData.getAll("gestores").map(String);
  const gestorComercialIds = formData.getAll("gestoresComercial").map(String);
  const consultorIds = formData.getAll("consultores").map(String);
  // Gerente de Unidade, Gerente Comercial e Consultor compartilham a mesma tabela de
  // vínculo usuario_unidades — basta juntar os três grupos de ids.
  const todosGestorIds = [...gestorIds, ...gestorComercialIds, ...consultorIds];

  const nome = String(formData.get("nome") ?? "").trim();
  const areaId = String(formData.get("areaId") ?? "");
  const cluster = parseCluster(formData.get("cluster"));

  if (!nome) return { error: "Informe o nome da unidade.", values, gestorIds, gestorComercialIds, consultorIds };
  if (!areaId) return { error: "Selecione a área.", values, gestorIds, gestorComercialIds, consultorIds };

  const existente = await prisma.unidade.findFirst({ where: { nome, areaId } });
  if (existente) {
    return {
      error: "Já existe uma unidade com esse nome nessa área.",
      values,
      gestorIds,
      gestorComercialIds,
      consultorIds,
    };
  }

  await prisma.unidade.create({
    data: {
      nome,
      areaId,
      cluster,
      usuarios: todosGestorIds.length
        ? { create: todosGestorIds.map((usuarioId) => ({ usuarioId })) }
        : undefined,
    },
  });

  revalidatePath("/unidades");
}

export async function atualizarUnidade(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);
  const gestorIds = formData.getAll("gestores").map(String);
  const gestorComercialIds = formData.getAll("gestoresComercial").map(String);
  const consultorIds = formData.getAll("consultores").map(String);
  const todosGestorIds = [...gestorIds, ...gestorComercialIds, ...consultorIds];

  const nome = String(formData.get("nome") ?? "").trim();
  const areaId = String(formData.get("areaId") ?? "");
  const cluster = parseCluster(formData.get("cluster"));

  if (!nome) return { error: "Informe o nome da unidade.", values, gestorIds, gestorComercialIds, consultorIds };
  if (!areaId) return { error: "Selecione a área.", values, gestorIds, gestorComercialIds, consultorIds };

  const duplicada = await prisma.unidade.findFirst({ where: { nome, areaId, NOT: { id } } });
  if (duplicada) {
    return {
      error: "Já existe uma unidade com esse nome nessa área.",
      values,
      gestorIds,
      gestorComercialIds,
      consultorIds,
    };
  }

  await prisma.$transaction([
    prisma.unidade.update({ where: { id }, data: { nome, areaId, cluster } }),
    prisma.usuarioUnidade.deleteMany({ where: { unidadeId: id } }),
    ...(todosGestorIds.length
      ? [
          prisma.usuarioUnidade.createMany({
            data: todosGestorIds.map((usuarioId) => ({ usuarioId, unidadeId: id })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/unidades");
}

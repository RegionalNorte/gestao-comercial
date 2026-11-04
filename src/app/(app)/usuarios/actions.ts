"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import type { Perfil } from "@/generated/prisma";

export type FormState = { error: string; values: Record<string, string> } | undefined;

const PERFIS_VALIDOS: Perfil[] = [
  "ADMIN",
  "ANALISTA",
  "GERENTE_REGIONAL",
  "GERENTE_AREA",
  "GERENTE_UNIDADE",
  "GERENTE_COMERCIAL",
];

// React reseta os campos não controlados do <form> depois que a action roda, mesmo em
// caso de erro. Devolvemos o que o usuário digitou para o form repopular via
// defaultValue (ver useActionState + key em UsuarioForm.tsx).
function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string" && !(key in out)) out[key] = val;
  }
  return out;
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Senha não é definida pelo Admin: o usuário fica criado "ativo" mas sem senha_hash,
// e a própria tela de login detecta isso e leva pra /criar-senha — é o usuário quem
// escolhe a própria senha, no primeiro acesso e sempre que ela for resetada.
export async function criarUsuario(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome.", values };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !validarEmail(email)) return { error: "Informe um e-mail válido.", values };

  const perfil = String(formData.get("perfil") ?? "") as Perfil;
  if (!PERFIS_VALIDOS.includes(perfil)) return { error: "Selecione um perfil.", values };

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return { error: "Já existe um usuário com esse e-mail.", values };

  await prisma.usuario.create({ data: { nome, email, perfil } });

  revalidatePath("/usuarios");
}

export async function atualizarUsuario(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  const values = echoValues(formData);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome.", values };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !validarEmail(email)) return { error: "Informe um e-mail válido.", values };

  const perfil = String(formData.get("perfil") ?? "") as Perfil;
  if (!PERFIS_VALIDOS.includes(perfil)) return { error: "Selecione um perfil.", values };

  const duplicado = await prisma.usuario.findFirst({ where: { email, NOT: { id } } });
  if (duplicado) return { error: "Já existe um usuário com esse e-mail.", values };

  await prisma.usuario.update({ where: { id }, data: { nome, email, perfil } });

  revalidatePath("/usuarios");
}

// Zera a senha do usuário: na próxima tentativa de login (com qualquer coisa no campo
// senha), a tela de login detecta que não há senha_hash e leva direto pra /criar-senha.
export async function resetarSenha(id: string): Promise<{ error?: string }> {
  await requirePerfil(["ADMIN", "ANALISTA"]);
  await prisma.usuario.update({ where: { id }, data: { senhaHash: null } });
  revalidatePath("/usuarios");
  return {};
}

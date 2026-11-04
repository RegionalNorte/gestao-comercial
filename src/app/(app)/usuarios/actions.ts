"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePerfil, type SessionPayload } from "@/lib/auth";
import type { Perfil } from "@/generated/prisma";

export type FormState = { error: string; values: Record<string, string> } | undefined;

const PERFIS_VALIDOS: Perfil[] = [
  "ADMIN",
  "ANALISTA",
  "GERENTE_REGIONAL",
  "GERENTE_AREA",
  "GERENTE_UNIDADE",
  "GERENTE_COMERCIAL",
  "CONSULTOR",
];

function escopoRestrito(session: SessionPayload): boolean {
  return session.perfil === "GERENTE_COMERCIAL" || session.perfil === "GERENTE_UNIDADE";
}

// Gerente Comercial/Unidade só gerencia Consultores das próprias unidades (vínculo em
// usuario_unidades) — usada antes de editar/desativar/ativar/resetar senha de alguém.
async function podeGerenciarConsultor(session: SessionPayload, usuarioId: string): Promise<boolean> {
  if (!escopoRestrito(session)) return true;
  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!alvo || alvo.perfil !== "CONSULTOR") return false;
  const vinculo = await prisma.usuarioUnidade.findFirst({
    where: { usuarioId: session.sub, unidade: { usuarios: { some: { usuarioId } } } },
  });
  return !!vinculo;
}

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
  const session = await requirePerfil(["ADMIN", "ANALISTA", "GERENTE_COMERCIAL", "GERENTE_UNIDADE"]);
  const values = echoValues(formData);

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome.", values };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !validarEmail(email)) return { error: "Informe um e-mail válido.", values };

  // Gerente Comercial/Unidade só cadastra Consultor, e só vinculado a uma unidade que
  // ele próprio gerencia (sem isso, não daria pra decidir reembolso/pedido desse
  // consultor depois).
  if (escopoRestrito(session)) {
    const unidadeId = String(formData.get("unidadeId") ?? "").trim();
    if (!unidadeId) return { error: "Selecione a unidade.", values };
    const vinculo = await prisma.usuarioUnidade.findUnique({
      where: { usuarioId_unidadeId: { usuarioId: session.sub, unidadeId } },
    });
    if (!vinculo) return { error: "Você não gerencia essa unidade.", values };

    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) return { error: "Já existe um usuário com esse e-mail.", values };

    await prisma.usuario.create({
      data: { nome, email, perfil: "CONSULTOR", unidades: { create: { unidadeId } } },
    });

    revalidatePath("/usuarios");
    return;
  }

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
  const session = await requirePerfil(["ADMIN", "ANALISTA", "GERENTE_COMERCIAL", "GERENTE_UNIDADE"]);
  const values = echoValues(formData);

  if (escopoRestrito(session) && !(await podeGerenciarConsultor(session, id))) {
    return { error: "Você não gerencia esse usuário.", values };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome.", values };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !validarEmail(email)) return { error: "Informe um e-mail válido.", values };

  const duplicado = await prisma.usuario.findFirst({ where: { email, NOT: { id } } });
  if (duplicado) return { error: "Já existe um usuário com esse e-mail.", values };

  // Gerente Comercial/Unidade só edita nome/e-mail — não pode trocar o perfil do
  // Consultor que gerencia.
  if (escopoRestrito(session)) {
    await prisma.usuario.update({ where: { id }, data: { nome, email } });
    revalidatePath("/usuarios");
    return;
  }

  const perfil = String(formData.get("perfil") ?? "") as Perfil;
  if (!PERFIS_VALIDOS.includes(perfil)) return { error: "Selecione um perfil.", values };

  await prisma.usuario.update({ where: { id }, data: { nome, email, perfil } });

  revalidatePath("/usuarios");
}

// Zera a senha do usuário: na próxima tentativa de login (com qualquer coisa no campo
// senha), a tela de login detecta que não há senha_hash e leva direto pra /criar-senha.
export async function resetarSenha(id: string): Promise<{ error?: string }> {
  const session = await requirePerfil(["ADMIN", "ANALISTA", "GERENTE_COMERCIAL", "GERENTE_UNIDADE"]);
  if (!(await podeGerenciarConsultor(session, id))) return { error: "Você não gerencia esse usuário." };
  await prisma.usuario.update({ where: { id }, data: { senhaHash: null } });
  revalidatePath("/usuarios");
  return {};
}

// Inativo bloqueia o acesso imediatamente (ver requireSession em src/lib/auth.ts) —
// inclusive sessão já aberta para de funcionar no próximo clique, sem esperar o token
// expirar.
export async function desativarUsuario(id: string): Promise<{ error?: string }> {
  const session = await requirePerfil(["ADMIN", "ANALISTA", "GERENTE_COMERCIAL", "GERENTE_UNIDADE"]);
  if (!(await podeGerenciarConsultor(session, id))) return { error: "Você não gerencia esse usuário." };
  await prisma.usuario.update({ where: { id }, data: { ativo: false } });
  revalidatePath("/usuarios");
  return {};
}

export async function ativarUsuario(id: string): Promise<{ error?: string }> {
  const session = await requirePerfil(["ADMIN", "ANALISTA", "GERENTE_COMERCIAL", "GERENTE_UNIDADE"]);
  if (!(await podeGerenciarConsultor(session, id))) return { error: "Você não gerencia esse usuário." };
  await prisma.usuario.update({ where: { id }, data: { ativo: true } });
  revalidatePath("/usuarios");
  return {};
}

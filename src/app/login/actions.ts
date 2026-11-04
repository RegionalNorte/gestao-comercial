"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, createPendingSenhaSession } from "@/lib/auth";

export type LoginState = { error: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { error: "Informe e-mail e senha." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Usuário recém-criado pelo Admin, ou com a senha resetada: ainda não tem senha_hash.
  // Em vez de validar credenciais (não há o que validar), leva direto pra tela de
  // criação de senha — é assim que o fluxo "esqueci a senha" se resolve sem depender
  // do Admin saber ou repassar uma senha.
  if (usuario && !usuario.senhaHash) {
    await createPendingSenhaSession(usuario.id);
    redirect("/criar-senha");
  }

  const senhaValida = usuario?.senhaHash
    ? await bcrypt.compare(senha, usuario.senhaHash)
    : false;

  if (!usuario || !senhaValida) {
    return { error: "E-mail ou senha inválidos." };
  }

  await createSession({
    sub: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
  });

  redirect("/");
}

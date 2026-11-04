"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, getPendingSenhaUsuarioId, clearPendingSenhaSession } from "@/lib/auth";

export type CriarSenhaState = { error: string } | undefined;

export async function criarSenha(
  _prevState: CriarSenhaState,
  formData: FormData,
): Promise<CriarSenhaState> {
  const usuarioId = await getPendingSenhaUsuarioId();
  if (!usuarioId) {
    redirect("/login");
  }

  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (!senha || senha.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (senha !== confirmarSenha) {
    return { error: "As senhas não coincidem." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  // Se alguém já definiu a senha nesse meio tempo, ou o usuário foi desativado
  // nesse meio tempo, essa janela não vale mais.
  if (!usuario || usuario.senhaHash || !usuario.ativo) {
    await clearPendingSenhaSession();
    redirect("/login");
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  await prisma.usuario.update({ where: { id: usuarioId }, data: { senhaHash } });
  await clearPendingSenhaSession();

  await createSession({
    sub: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
  });

  redirect("/");
}

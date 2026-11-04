import { redirect } from "next/navigation";
import { getPendingSenhaUsuarioId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CriarSenhaForm } from "./CriarSenhaForm";

export default async function CriarSenhaPage() {
  const usuarioId = await getPendingSenhaUsuarioId();
  if (!usuarioId) redirect("/login");

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || usuario.senhaHash) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="flex flex-col justify-center bg-navy px-8 py-12 md:w-[42%] md:px-14">
        <div className="mb-4 h-[0.1875rem] w-10 bg-green" />
        <h1 className="font-display text-3xl font-semibold text-white md:text-4xl">
          Gestão Comercial
        </h1>
        <p className="mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-white/70">
          Controle de metas, verbas e fornecedores por unidade.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-8 py-16">
        <div className="w-full max-w-sm">
          <h2 className="font-display mb-2 text-2xl font-semibold text-navy">
            Defina sua senha
          </h2>
          <p className="mb-8 text-[0.9375rem] text-muted">
            Olá, {usuario.nome}. Escolha a senha que você vai usar a partir de agora.
          </p>
          <CriarSenhaForm />
        </div>
      </div>
    </div>
  );
}

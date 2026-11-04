"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "@/components/SlideOver";
import { UsuarioForm } from "./UsuarioForm";
import { criarUsuario, atualizarUsuario, resetarSenha, desativarUsuario, ativarUsuario } from "./actions";
import type { Perfil } from "@/generated/prisma";

export type UsuarioRow = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  temSenha: boolean;
  vinculos: string[];
};

type Drawer = { type: "novo" } | { type: "editar"; usuario: UsuarioRow } | null;

const PERFIL_LABEL: Record<Perfil, string> = {
  ADMIN: "Admin",
  ANALISTA: "Analista",
  GERENTE_REGIONAL: "Gerente Regional",
  GERENTE_AREA: "Gerente de Área",
  GERENTE_UNIDADE: "Gerente de Unidade",
  GERENTE_COMERCIAL: "Gerente Comercial",
  CONSULTOR: "Consultor",
};

export function UsuariosClient({
  usuarios,
  escopoRestrito,
  unidadesGerenciadas,
}: {
  usuarios: UsuarioRow[];
  escopoRestrito: boolean;
  unidadesGerenciadas: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [resetandoId, setResetandoId] = useState<string | null>(null);
  const [alternandoId, setAlternandoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeDrawer() {
    setDrawer(null);
  }

  function handleSuccess() {
    setDrawer(null);
    router.refresh();
  }

  function handleResetarSenha(usuario: UsuarioRow) {
    const confirmado = window.confirm(
      `Resetar a senha de ${usuario.nome}? Ele vai precisar definir uma nova senha no próximo login.`,
    );
    if (!confirmado) return;
    setResetandoId(usuario.id);
    startTransition(async () => {
      await resetarSenha(usuario.id);
      setResetandoId(null);
      router.refresh();
    });
  }

  function handleAlternarAtivo(usuario: UsuarioRow) {
    const confirmado = window.confirm(
      usuario.ativo
        ? `Desativar ${usuario.nome}? O acesso dele é bloqueado imediatamente, em qualquer tela.`
        : `Reativar ${usuario.nome}?`,
    );
    if (!confirmado) return;
    setAlternandoId(usuario.id);
    startTransition(async () => {
      await (usuario.ativo ? desativarUsuario(usuario.id) : ativarUsuario(usuario.id));
      setAlternandoId(null);
      router.refresh();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-10 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">Cadastros</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy">
              {escopoRestrito ? "Consultores" : "Usuários"}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setDrawer({ type: "novo" })}
            className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90"
          >
            {escopoRestrito ? "+ Novo consultor" : "+ Novo usuário"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-8 pb-10">
        {usuarios.length === 0 ? (
          <p className="rounded-md border border-border px-5 py-4 text-[0.9375rem] text-muted">
            Nenhum usuário cadastrado ainda.
          </p>
        ) : (
          <div className="h-full overflow-y-auto rounded-md border border-border">
            <table className="w-full border-separate border-spacing-0 text-left text-[0.875rem]">
              <thead>
                <tr className="sticky top-0 z-10 bg-background text-muted">
                  <th className="border-b border-border px-5 py-2.5 font-medium">Nome</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">E-mail</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Perfil</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Vínculo</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Status</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Acesso</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-t border-border">
                    <td className="px-5 py-2.5 text-navy">{usuario.nome}</td>
                    <td className="px-5 py-2.5 text-navy">{usuario.email}</td>
                    <td className="px-5 py-2.5 text-navy">{PERFIL_LABEL[usuario.perfil]}</td>
                    <td className="px-5 py-2.5 text-navy">
                      {usuario.vinculos.length > 0 ? usuario.vinculos.join(", ") : "—"}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-navy">
                        <span className={`h-1.5 w-1.5 rounded-full ${usuario.ativo ? "bg-green" : "bg-error"}`} />
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-navy">
                        <span className={`h-1.5 w-1.5 rounded-full ${usuario.temSenha ? "bg-green" : "bg-muted"}`} />
                        {usuario.temSenha ? "Senha definida" : "Aguardando criação de senha"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-4">
                        {usuario.temSenha ? (
                          <button
                            type="button"
                            disabled={isPending && resetandoId === usuario.id}
                            onClick={() => handleResetarSenha(usuario)}
                            className="text-cyan-deep hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isPending && resetandoId === usuario.id ? "Resetando..." : "Resetar senha"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={isPending && alternandoId === usuario.id}
                          onClick={() => handleAlternarAtivo(usuario)}
                          className={`hover:underline disabled:cursor-not-allowed disabled:opacity-60 ${
                            usuario.ativo ? "text-error" : "text-cyan-deep"
                          }`}
                        >
                          {isPending && alternandoId === usuario.id
                            ? "Salvando..."
                            : usuario.ativo
                              ? "Desativar"
                              : "Ativar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDrawer({ type: "editar", usuario })}
                          className="text-cyan-deep hover:underline"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SlideOver
        open={drawer?.type === "novo" || drawer?.type === "editar"}
        onClose={closeDrawer}
        title={drawer?.type === "editar" ? "Editar usuário" : "Novo usuário"}
      >
        {drawer?.type === "novo" ? (
          <UsuarioForm
            action={criarUsuario}
            escopoRestrito={escopoRestrito}
            unidadesDisponiveis={unidadesGerenciadas}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : drawer?.type === "editar" ? (
          <UsuarioForm
            key={drawer.usuario.id}
            action={atualizarUsuario.bind(null, drawer.usuario.id)}
            nomeInicial={drawer.usuario.nome}
            emailInicial={drawer.usuario.email}
            perfilInicial={drawer.usuario.perfil}
            ehEdicao
            escopoRestrito={escopoRestrito}
            unidadesDisponiveis={unidadesGerenciadas}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : null}
      </SlideOver>
    </div>
  );
}

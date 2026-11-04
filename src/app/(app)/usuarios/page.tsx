import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { UsuariosClient, type UsuarioRow } from "./UsuariosClient";

export default async function UsuariosPage() {
  const session = await requirePerfil(["ADMIN", "ANALISTA", "GERENTE_COMERCIAL", "GERENTE_UNIDADE"]);

  // Gerente Comercial/Unidade (pares) só gerenciam Consultores da própria unidade —
  // Admin/Analista continuam vendo e gerenciando todo mundo, sem restrição.
  const escopoRestrito = session.perfil === "GERENTE_COMERCIAL" || session.perfil === "GERENTE_UNIDADE";

  let unidadesGerenciadas: { id: string; nome: string }[] = [];
  if (escopoRestrito) {
    const vinculos = await prisma.usuarioUnidade.findMany({
      where: { usuarioId: session.sub },
      include: { unidade: true },
    });
    unidadesGerenciadas = vinculos.map((v) => ({ id: v.unidade.id, nome: v.unidade.nome }));
  }
  const unidadeIdsGerenciadas = unidadesGerenciadas.map((u) => u.id);

  const usuariosRaw = await prisma.usuario.findMany({
    where: escopoRestrito
      ? { perfil: "CONSULTOR", unidades: { some: { unidadeId: { in: unidadeIdsGerenciadas } } } }
      : {},
    include: {
      areas: { include: { area: true } },
      unidades: { include: { unidade: true } },
    },
    orderBy: { nome: "asc" },
  });

  // Vínculo a área/unidade é gerenciado na tela Unidades (lá o Admin escolhe o
  // gestor de cada área/unidade) — aqui só mostramos o resumo, somado ao perfil, pra
  // dar visibilidade de quem gerencia o quê sem duplicar a edição em dois lugares.
  const usuarios: UsuarioRow[] = usuariosRaw.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
    ativo: u.ativo,
    temSenha: u.senhaHash !== null,
    vinculos:
      u.perfil === "GERENTE_AREA"
        ? u.areas.map((a) => a.area.nome)
        : u.perfil === "GERENTE_UNIDADE" || u.perfil === "GERENTE_COMERCIAL" || u.perfil === "CONSULTOR"
          ? u.unidades.map((v) => v.unidade.nome)
          : [],
  }));

  return (
    <UsuariosClient
      usuarios={usuarios}
      escopoRestrito={escopoRestrito}
      unidadesGerenciadas={unidadesGerenciadas}
    />
  );
}

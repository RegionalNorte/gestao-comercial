import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { UsuariosClient, type UsuarioRow } from "./UsuariosClient";

export default async function UsuariosPage() {
  await requirePerfil(["ADMIN", "ANALISTA"]);

  const usuariosRaw = await prisma.usuario.findMany({
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
    temSenha: u.senhaHash !== null,
    vinculos:
      u.perfil === "GERENTE_AREA"
        ? u.areas.map((a) => a.area.nome)
        : u.perfil === "GERENTE_UNIDADE" || u.perfil === "GERENTE_COMERCIAL"
          ? u.unidades.map((v) => v.unidade.nome)
          : [],
  }));

  return <UsuariosClient usuarios={usuarios} />;
}

import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { UnidadesClient, type AreaData, type UnidadeRow } from "./UnidadesClient";

export default async function UnidadesPage() {
  await requirePerfil(["ADMIN", "ANALISTA"]);

  const [areasRaw, gestoresArea, gestoresUnidade, gestoresComercial, consultores] = await Promise.all([
    prisma.area.findMany({
      orderBy: { nome: "asc" },
      include: {
        usuarios: { include: { usuario: { select: { id: true, nome: true } } } },
        unidades: {
          orderBy: { nome: "asc" },
          // Gerente de Unidade e Gerente Comercial são pares (mesma função, mesma
          // tabela de vínculo usuario_unidades) — o perfil de cada usuário é o que
          // decide em qual das duas colunas ele aparece na tela.
          include: {
            usuarios: { include: { usuario: { select: { id: true, nome: true, perfil: true } } } },
          },
        },
      },
    }),
    prisma.usuario.findMany({
      where: { perfil: "GERENTE_AREA" },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: "asc" },
    }),
    prisma.usuario.findMany({
      where: { perfil: "GERENTE_UNIDADE" },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: "asc" },
    }),
    prisma.usuario.findMany({
      where: { perfil: "GERENTE_COMERCIAL" },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: "asc" },
    }),
    prisma.usuario.findMany({
      where: { perfil: "CONSULTOR" },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const areas: AreaData[] = areasRaw.map((area) => ({
    id: area.id,
    nome: area.nome,
    gestorNomes: area.usuarios.map((u) => u.usuario.nome),
    gestorIds: area.usuarios.map((u) => u.usuario.id),
  }));

  const unidades: UnidadeRow[] = areasRaw.flatMap((area) =>
    area.unidades.map((unidade) => {
      const vinculosUnidade = unidade.usuarios.filter((u) => u.usuario.perfil === "GERENTE_UNIDADE");
      const vinculosComercial = unidade.usuarios.filter((u) => u.usuario.perfil === "GERENTE_COMERCIAL");
      const vinculosConsultor = unidade.usuarios.filter((u) => u.usuario.perfil === "CONSULTOR");
      return {
        id: unidade.id,
        nome: unidade.nome,
        cluster: unidade.cluster,
        areaId: area.id,
        areaNome: area.nome,
        gestorNomes: vinculosUnidade.map((u) => u.usuario.nome),
        gestorIds: vinculosUnidade.map((u) => u.usuario.id),
        gestorComercialNomes: vinculosComercial.map((u) => u.usuario.nome),
        gestorComercialIds: vinculosComercial.map((u) => u.usuario.id),
        consultorNomes: vinculosConsultor.map((u) => u.usuario.nome),
        consultorIds: vinculosConsultor.map((u) => u.usuario.id),
      };
    }),
  );

  return (
    <UnidadesClient
      areas={areas}
      unidades={unidades}
      gestoresArea={gestoresArea}
      gestoresUnidade={gestoresUnidade}
      gestoresComercial={gestoresComercial}
      consultores={consultores}
    />
  );
}

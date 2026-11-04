import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { PlanejamentoClient, type PlanejamentoRow, type TipoPlanejamentoRow } from "./PlanejamentoClient";

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ ciclo?: string }>;
}) {
  const session = await requirePerfil([
    "ADMIN",
    "ANALISTA",
    "GERENTE_REGIONAL",
    "GERENTE_AREA",
    "GERENTE_UNIDADE",
    "GERENTE_COMERCIAL",
  ]);

  const podeCriar =
    session.perfil === "ADMIN" || session.perfil === "GERENTE_UNIDADE" || session.perfil === "GERENTE_COMERCIAL";
  const podeDecidirArea = session.perfil === "ADMIN" || session.perfil === "GERENTE_AREA";
  const podeDecidirRegional = session.perfil === "ADMIN" || session.perfil === "GERENTE_REGIONAL";
  const podeGerenciarTipos = session.perfil === "ADMIN" || session.perfil === "ANALISTA";

  // Mesma restrição de visibilidade das outras telas: Gerente de Área só vê as unidades
  // da própria área; Gerente de Unidade só as que gerencia.
  let unidadeIdsVisiveis: string[] | null = null;
  if (session.perfil === "GERENTE_AREA") {
    const areasDoUsuario = await prisma.usuarioArea.findMany({ where: { usuarioId: session.sub } });
    const areaIds = areasDoUsuario.map((a) => a.areaId);
    const unidadesDaArea = await prisma.unidade.findMany({ where: { areaId: { in: areaIds } } });
    unidadeIdsVisiveis = unidadesDaArea.map((u) => u.id);
  } else if (session.perfil === "GERENTE_UNIDADE" || session.perfil === "GERENTE_COMERCIAL") {
    const unidadesDoUsuario = await prisma.usuarioUnidade.findMany({ where: { usuarioId: session.sub } });
    unidadeIdsVisiveis = unidadesDoUsuario.map((u) => u.unidadeId);
  }

  // Planejamento (ENEM, Viva Estácio etc.) só se aplica ao segundo ciclo do ano (nome
  // terminando em ".2", ex.: 27.2, 28.2) — ciclos ".1" não aparecem aqui nem como opção.
  const ciclosRaw = await prisma.ciclo.findMany({ orderBy: { createdAt: "desc" } });
  const ciclos = ciclosRaw.filter((c) => c.nome.trim().endsWith(".2"));
  const { ciclo: cicloParam } = await searchParams;
  const cicloSelecionado =
    ciclos.find((c) => c.id === cicloParam) ?? ciclos.find((c) => c.status === "Aberto") ?? ciclos[0] ?? null;

  const planejamentosRaw = cicloSelecionado
    ? await prisma.planejamento.findMany({
        where: {
          cicloId: cicloSelecionado.id,
          ...(unidadeIdsVisiveis ? { unidadeId: { in: unidadeIdsVisiveis } } : {}),
        },
        include: {
          unidade: { include: { area: true } },
          tipoPlanejamento: true,
          solicitadoPor: true,
          decisaoAreaPor: true,
          decisaoRegionalPor: true,
        },
        orderBy: { dataSolicitacao: "desc" },
      })
    : [];

  // Só pode marcar como realizado um planejamento aprovado, solicitado pelo próprio
  // usuário (Admin pode qualquer um), e com o ciclo já tendo começado.
  const cicloJaComecou = !!cicloSelecionado?.dataInicio && new Date() >= cicloSelecionado.dataInicio;

  const linhas: PlanejamentoRow[] = planejamentosRaw.map((p) => ({
    id: p.id,
    areaNome: p.unidade.area.nome,
    unidadeNome: p.unidade.nome,
    tipoNome: p.tipoPlanejamento.nome,
    valor: Number(p.valor),
    observacao: p.observacao,
    statusGeral: p.statusGeral,
    decisaoAreaStatus: p.decisaoAreaStatus,
    decisaoAreaPorNome: p.decisaoAreaPor?.nome ?? null,
    decisaoAreaEm: toIso(p.decisaoAreaEm),
    decisaoRegionalStatus: p.decisaoRegionalStatus,
    decisaoRegionalPorNome: p.decisaoRegionalPor?.nome ?? null,
    decisaoRegionalEm: toIso(p.decisaoRegionalEm),
    solicitadoPorNome: p.solicitadoPor.nome,
    dataSolicitacao: toIso(p.dataSolicitacao)!,
    realizado: p.realizado,
    podeMarcarRealizado:
      !p.realizado &&
      p.statusGeral === "APROVADO" &&
      cicloJaComecou &&
      (session.perfil === "ADMIN" || p.solicitadoPorId === session.sub),
  }));

  let unidadesParaCriar: { id: string; nome: string; areaNome: string }[] = [];
  if (podeCriar) {
    const unidadesRaw = await prisma.unidade.findMany({ include: { area: true }, orderBy: { nome: "asc" } });
    unidadesParaCriar =
      session.perfil === "ADMIN"
        ? unidadesRaw.map((u) => ({ id: u.id, nome: u.nome, areaNome: u.area.nome }))
        : unidadesRaw
            .filter((u) => unidadeIdsVisiveis?.includes(u.id))
            .map((u) => ({ id: u.id, nome: u.nome, areaNome: u.area.nome }));
  }

  const todosTiposRaw = podeGerenciarTipos || podeCriar ? await prisma.tipoPlanejamento.findMany({ orderBy: { nome: "asc" } }) : [];
  const tipos = todosTiposRaw.filter((t) => t.ativo).map((t) => ({ id: t.id, nome: t.nome }));
  const todosTipos: TipoPlanejamentoRow[] = todosTiposRaw.map((t) => ({ id: t.id, nome: t.nome, ativo: t.ativo }));

  return (
    <PlanejamentoClient
      ciclos={ciclos.map((c) => ({ id: c.id, nome: c.nome }))}
      cicloSelecionadoId={cicloSelecionado?.id ?? ""}
      linhas={linhas}
      unidadesParaCriar={unidadesParaCriar}
      tipos={tipos}
      todosTipos={todosTipos}
      podeCriar={podeCriar}
      podeDecidirArea={podeDecidirArea}
      podeDecidirRegional={podeDecidirRegional}
      podeGerenciarTipos={podeGerenciarTipos}
    />
  );
}

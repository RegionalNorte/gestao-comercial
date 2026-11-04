import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { VerbaExtraClient, type SolicitacaoExtraRow } from "./VerbaExtraClient";

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export default async function VerbaExtraPage({
  searchParams,
}: {
  searchParams: Promise<{ ciclo?: string }>;
}) {
  const session = await requirePerfil(["ADMIN", "ANALISTA", "GERENTE_REGIONAL", "GERENTE_AREA"]);

  const podeCriar = session.perfil === "ADMIN" || session.perfil === "GERENTE_AREA";
  // Quem decide verba extra é sempre o Analista (ou Admin) — Gerente Regional só tem
  // visibilidade total, sem autoridade de aprovação aqui (diferente de Pedidos).
  const podeDecidir = session.perfil === "ADMIN" || session.perfil === "ANALISTA";

  let areaIds: string[] = [];
  if (session.perfil === "GERENTE_AREA") {
    const vinculos = await prisma.usuarioArea.findMany({ where: { usuarioId: session.sub } });
    areaIds = vinculos.map((v) => v.areaId);
  }

  const ciclos = await prisma.ciclo.findMany({ orderBy: { createdAt: "desc" } });
  const { ciclo: cicloParam } = await searchParams;
  const cicloSelecionado =
    ciclos.find((c) => c.id === cicloParam) ?? ciclos.find((c) => c.status === "Aberto") ?? ciclos[0] ?? null;

  const unidadesRaw = await prisma.unidade.findMany({ include: { area: true }, orderBy: { nome: "asc" } });
  const unidades =
    session.perfil === "ADMIN"
      ? unidadesRaw.map((u) => ({ id: u.id, nome: u.nome, areaNome: u.area.nome }))
      : unidadesRaw.filter((u) => areaIds.includes(u.areaId)).map((u) => ({ id: u.id, nome: u.nome, areaNome: u.area.nome }));

  const solicitacoesRaw = cicloSelecionado
    ? await prisma.solicitacaoVerbaExtra.findMany({
        where: {
          cicloId: cicloSelecionado.id,
          ...(session.perfil === "GERENTE_AREA" ? { unidade: { areaId: { in: areaIds } } } : {}),
        },
        include: { unidade: { include: { area: true } }, solicitadoPor: true, analisadoPor: true },
        orderBy: { dataSolicitacao: "desc" },
      })
    : [];

  const linhas: SolicitacaoExtraRow[] = solicitacoesRaw.map((s) => ({
    id: s.id,
    areaNome: s.unidade.area.nome,
    unidadeNome: s.unidade.nome,
    valor: Number(s.valor),
    motivo: s.motivo,
    status: s.status,
    solicitadoPorNome: s.solicitadoPor.nome,
    dataSolicitacao: toIso(s.dataSolicitacao)!,
    analisadoPorNome: s.analisadoPor?.nome ?? null,
    dataAnalise: toIso(s.dataAnalise),
    comentarioAnalista: s.comentarioAnalista,
  }));

  return (
    <VerbaExtraClient
      ciclos={ciclos.map((c) => ({ id: c.id, nome: c.nome }))}
      cicloSelecionadoId={cicloSelecionado?.id ?? ""}
      linhas={linhas}
      unidades={unidades}
      podeCriar={podeCriar}
      podeDecidir={podeDecidir}
    />
  );
}

import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { TransferenciasClient, type TransferenciaRow } from "./TransferenciasClient";

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export default async function TransferenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ ciclo?: string }>;
}) {
  const session = await requirePerfil(["ADMIN", "ANALISTA", "GERENTE_REGIONAL", "GERENTE_AREA"]);

  const podeCriar = session.perfil === "ADMIN" || session.perfil === "GERENTE_AREA";

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
  const unidadesOrigem = unidadesRaw.map((u) => ({ id: u.id, nome: u.nome, areaNome: u.area.nome }));
  const unidadesDestino =
    session.perfil === "ADMIN"
      ? unidadesOrigem
      : unidadesRaw.filter((u) => areaIds.includes(u.areaId)).map((u) => ({ id: u.id, nome: u.nome, areaNome: u.area.nome }));

  const transferenciasRaw = cicloSelecionado
    ? await prisma.transferenciaSaldo.findMany({
        where: {
          cicloId: cicloSelecionado.id,
          ...(session.perfil === "GERENTE_AREA"
            ? {
                OR: [
                  { unidadeOrigem: { areaId: { in: areaIds } } },
                  { unidadeDestino: { areaId: { in: areaIds } } },
                ],
              }
            : {}),
        },
        include: {
          unidadeOrigem: { include: { area: true } },
          unidadeDestino: { include: { area: true } },
          solicitadoPor: true,
          aprovadoPor: true,
        },
        orderBy: { dataSolicitacao: "desc" },
      })
    : [];

  const linhas: TransferenciaRow[] = transferenciasRaw.map((t) => ({
    id: t.id,
    areaOrigemNome: t.unidadeOrigem.area.nome,
    unidadeOrigemNome: t.unidadeOrigem.nome,
    areaDestinoNome: t.unidadeDestino.area.nome,
    unidadeDestinoNome: t.unidadeDestino.nome,
    valor: Number(t.valor),
    tipo: t.tipo,
    status: t.status,
    solicitadoPorNome: t.solicitadoPor.nome,
    dataSolicitacao: toIso(t.dataSolicitacao)!,
    aprovadoPorNome: t.aprovadoPor?.nome ?? null,
    dataDecisao: toIso(t.dataDecisao),
    observacao: t.observacao,
    podeDecidir: session.perfil === "ADMIN" || (session.perfil === "GERENTE_AREA" && areaIds.includes(t.unidadeOrigem.areaId)),
  }));

  return (
    <TransferenciasClient
      ciclos={ciclos.map((c) => ({ id: c.id, nome: c.nome }))}
      cicloSelecionadoId={cicloSelecionado?.id ?? ""}
      linhas={linhas}
      unidadesOrigem={unidadesOrigem}
      unidadesDestino={unidadesDestino}
      podeCriar={podeCriar}
    />
  );
}

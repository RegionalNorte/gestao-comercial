import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { ReembolsoKmClient, type ReembolsoKmRow } from "./ReembolsoKmClient";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toIso(d: Date): string {
  return d.toISOString();
}

export default async function ReembolsoKmPage() {
  const session = await requirePerfil([
    "ADMIN",
    "ANALISTA",
    "GERENTE_REGIONAL",
    "GERENTE_COMERCIAL",
    "GERENTE_UNIDADE",
    "CONSULTOR",
  ]);

  const podeCriar = session.perfil === "CONSULTOR";
  const podeDecidirComercial =
    session.perfil === "ADMIN" || session.perfil === "GERENTE_COMERCIAL" || session.perfil === "GERENTE_UNIDADE";
  const podeDecidirRegional = session.perfil === "ADMIN" || session.perfil === "GERENTE_REGIONAL";

  // Consultor só vê os próprios; Gerente Comercial/Unidade só os das unidades que
  // gerencia (vínculo em usuario_unidades); Gerente Regional/Analista/Admin veem tudo.
  let unidadeIdsVisiveis: string[] | null = null;
  if (session.perfil === "GERENTE_COMERCIAL" || session.perfil === "GERENTE_UNIDADE") {
    const vinculos = await prisma.usuarioUnidade.findMany({ where: { usuarioId: session.sub } });
    unidadeIdsVisiveis = vinculos.map((v) => v.unidadeId);
  }

  const reembolsosRaw = await prisma.reembolsoKm.findMany({
    where: {
      ...(session.perfil === "CONSULTOR" ? { consultorId: session.sub } : {}),
      ...(unidadeIdsVisiveis ? { unidadeId: { in: unidadeIdsVisiveis } } : {}),
    },
    include: {
      unidade: { include: { area: true } },
      consultor: true,
      eventos: { include: { usuario: true }, orderBy: { criadoEm: "asc" } },
      itens: { orderBy: { data: "asc" } },
    },
    orderBy: { dataSolicitacao: "desc" },
  });

  const linhas: ReembolsoKmRow[] = reembolsosRaw.map((r) => ({
    id: r.id,
    unidadeNome: r.unidade.nome,
    areaNome: r.unidade.area.nome,
    consultorNome: r.consultor.nome,
    colaborador: r.colaborador,
    equipe: r.equipe,
    periodoInicio: toIsoDate(r.periodoInicio),
    periodoFim: toIsoDate(r.periodoFim),
    totalKm: Number(r.totalKm),
    totalValor: Number(r.totalValor),
    status: r.status,
    dataSolicitacao: toIso(r.dataSolicitacao),
    eventos: r.eventos.map((e) => ({
      tipo: e.tipo,
      usuarioNome: e.usuario.nome,
      dataHora: toIso(e.criadoEm),
      comentario: e.comentario,
    })),
    itens: r.itens.map((item) => ({
      id: item.id,
      data: toIsoDate(item.data),
      tarefaCodigo: item.tarefaCodigo,
      clientePartida: item.clientePartida,
      clienteChegada: item.clienteChegada,
      km: Number(item.km),
      valor: Number(item.valor),
      ignorado: item.ignorado,
    })),
  }));

  let unidadesParaCriar: { id: string; nome: string; areaNome: string }[] = [];
  if (podeCriar) {
    const vinculos = await prisma.usuarioUnidade.findMany({
      where: { usuarioId: session.sub },
      include: { unidade: { include: { area: true } } },
    });
    unidadesParaCriar = vinculos.map((v) => ({
      id: v.unidade.id,
      nome: v.unidade.nome,
      areaNome: v.unidade.area.nome,
    }));
  }

  return (
    <ReembolsoKmClient
      linhas={linhas}
      unidadesParaCriar={unidadesParaCriar}
      podeCriar={podeCriar}
      podeDecidirComercial={podeDecidirComercial}
      podeDecidirRegional={podeDecidirRegional}
    />
  );
}

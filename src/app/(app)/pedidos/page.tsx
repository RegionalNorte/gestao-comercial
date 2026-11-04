import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { calcularSaldoDisponivel } from "@/lib/saldo";
import { PedidosClient, type PedidoRow } from "./PedidosClient";

function toIsoDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export default async function PedidosPage({
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

  // Gerente Comercial é par do Gerente de Unidade — mesma função dentro da unidade.
  const podeCriar =
    session.perfil === "ADMIN" || session.perfil === "GERENTE_UNIDADE" || session.perfil === "GERENTE_COMERCIAL";
  // Fluxo: a unidade pede; Gerente de Área, Analista ou Gerente Regional aprovam ou
  // rejeitam (Gerente de Área só das unidades da própria área — já restrito por
  // unidadeIdsVisiveis abaixo, então nem vê pedido de outra área pra decidir). Depois de
  // aprovado (e antes de pago) ainda dá pra rejeitar como checagem final. Marcar como
  // pago continua exclusivo de Admin/Analista.
  const podeDecidir =
    session.perfil === "ADMIN" ||
    session.perfil === "ANALISTA" ||
    session.perfil === "GERENTE_REGIONAL" ||
    session.perfil === "GERENTE_AREA";
  const podePagar = session.perfil === "ADMIN" || session.perfil === "ANALISTA";
  // Fornecedor/BV%/Taxa%/valor bruto são controle do Analista (definido em Metas e
  // Valores) — só quem tem visibilidade financeira total vê esse detalhamento aqui.
  const podeVerFinanceiro =
    session.perfil === "ADMIN" || session.perfil === "ANALISTA" || session.perfil === "GERENTE_REGIONAL";

  const ciclos = await prisma.ciclo.findMany({ orderBy: { createdAt: "desc" } });
  const { ciclo: cicloParam } = await searchParams;
  const cicloSelecionado =
    ciclos.find((c) => c.id === cicloParam) ?? ciclos.find((c) => c.status === "Aberto") ?? ciclos[0] ?? null;

  let unidadeIdsVisiveis: string[] | null = null; // null = sem restrição (vê tudo)
  if (session.perfil === "GERENTE_AREA") {
    const areasDoUsuario = await prisma.usuarioArea.findMany({ where: { usuarioId: session.sub } });
    const areaIds = areasDoUsuario.map((a) => a.areaId);
    const unidadesDaArea = await prisma.unidade.findMany({ where: { areaId: { in: areaIds } } });
    unidadeIdsVisiveis = unidadesDaArea.map((u) => u.id);
  } else if (session.perfil === "GERENTE_UNIDADE" || session.perfil === "GERENTE_COMERCIAL") {
    const unidadesDoUsuario = await prisma.usuarioUnidade.findMany({ where: { usuarioId: session.sub } });
    unidadeIdsVisiveis = unidadesDoUsuario.map((u) => u.unidadeId);
  }

  const pedidosRaw = cicloSelecionado
    ? await prisma.pedido.findMany({
        where: {
          cicloId: cicloSelecionado.id,
          ...(unidadeIdsVisiveis ? { unidadeId: { in: unidadeIdsVisiveis } } : {}),
        },
        include: {
          unidade: { include: { area: true } },
          fornecedor: true,
          eventos: { include: { usuario: true }, orderBy: { criadoEm: "asc" } },
        },
        orderBy: { dataSolicitacao: "desc" },
      })
    : [];

  const linhas: PedidoRow[] = pedidosRaw.map((p) => ({
    id: p.id,
    unidadeNome: p.unidade.nome,
    areaNome: p.unidade.area.nome,
    fornecedorNome: p.fornecedor.nome,
    servico: p.servico,
    dataDesejada: toIsoDate(p.dataDesejada) ?? "",
    valorLiquido: Number(p.valorLiquido),
    bv: Number(p.bv),
    taxa: Number(p.taxa),
    valorBruto: Number(p.valorBruto),
    status: p.status,
    eventos: p.eventos.map((e) => ({
      tipo: e.tipo,
      usuarioNome: e.usuario.nome,
      dataHora: toIso(e.criadoEm)!,
      comentario: e.comentario,
    })),
  }));

  let unidadesParaCriar: {
    id: string;
    nome: string;
    areaNome: string;
    bvPct: number | null;
    taxaPct: number | null;
    saldoDisponivel: number | null;
  }[] = [];
  if (podeCriar) {
    let unidadesBase: { id: string; nome: string; areaNome: string }[] = [];
    if (session.perfil === "ADMIN") {
      const unidades = await prisma.unidade.findMany({ include: { area: true }, orderBy: { nome: "asc" } });
      unidadesBase = unidades.map((u) => ({ id: u.id, nome: u.nome, areaNome: u.area.nome }));
    } else {
      const vinculos = await prisma.usuarioUnidade.findMany({
        where: { usuarioId: session.sub },
        include: { unidade: { include: { area: true } } },
      });
      unidadesBase = vinculos.map((v) => ({
        id: v.unidade.id,
        nome: v.unidade.nome,
        areaNome: v.unidade.area.nome,
      }));
    }

    // Gerente de Unidade não vê BV%/Taxa% (controle do Analista), mas pode ver em tempo
    // real quanto o valor líquido digitado vira de bruto — usamos o fornecedor já
    // configurado no ciclo aberto mais recente pra essa unidade, só pra essa estimativa.
    const metasAbertas =
      unidadesBase.length > 0
        ? await prisma.meta.findMany({
            where: { unidadeId: { in: unidadesBase.map((u) => u.id) }, ciclo: { status: "Aberto" } },
            include: { fornecedor: true },
            orderBy: { ciclo: { dataInicio: "desc" } },
          })
        : [];
    const percentuaisPorUnidade = new Map<string, { bvPct: number; taxaPct: number; cicloId: string }>();
    for (const m of metasAbertas) {
      if (percentuaisPorUnidade.has(m.unidadeId)) continue;
      if (m.fornecedor && m.fornecedor.bvPct !== null && m.fornecedor.taxaPct !== null) {
        percentuaisPorUnidade.set(m.unidadeId, {
          bvPct: Number(m.fornecedor.bvPct),
          taxaPct: Number(m.fornecedor.taxaPct),
          cicloId: m.cicloId,
        });
      }
    }

    // Saldo já considerando pedidos pendentes/aprovados (não só pagos) — mesma conta de
    // calcularSaldoDisponivel — pra avisar em tempo real se o pedido vai estourar antes
    // mesmo de enviar, sem precisar mostrar BV%/Taxa% pro Gerente de Unidade.
    unidadesParaCriar = await Promise.all(
      unidadesBase.map(async (u) => {
        const info = percentuaisPorUnidade.get(u.id);
        const saldoDisponivel = info ? await calcularSaldoDisponivel(u.id, info.cicloId) : null;
        return {
          ...u,
          bvPct: info?.bvPct ?? null,
          taxaPct: info?.taxaPct ?? null,
          saldoDisponivel,
        };
      }),
    );
  }

  return (
    <PedidosClient
      ciclos={ciclos.map((c) => ({ id: c.id, nome: c.nome }))}
      cicloSelecionadoId={cicloSelecionado?.id ?? ""}
      linhas={linhas}
      unidadesParaCriar={unidadesParaCriar}
      podeCriar={podeCriar}
      podeDecidir={podeDecidir}
      podePagar={podePagar}
      podeVerFinanceiro={podeVerFinanceiro}
    />
  );
}

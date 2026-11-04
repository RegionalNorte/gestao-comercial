import { prisma } from "@/lib/prisma";
import { requirePerfil } from "@/lib/auth";
import { MetasClient, type AreaAgregado, type MetaRow } from "./MetasClient";

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export default async function MetasEValoresPage({
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
  const podeEditar = session.perfil === "ADMIN" || session.perfil === "ANALISTA";

  // Mesma restrição de visibilidade aplicada em Pedidos/Transferências/Verba Extra:
  // Gerente de Área só vê as unidades da própria área; Gerente de Unidade só as que gerencia.
  // A combinação de qual unidade de outra área vai ceder saldo numa transferência entre
  // áreas é feita por fora do app (e-mail/ligação entre os gerentes) — o app só registra
  // o pedido já com a unidade de origem definida.
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

  const [ciclos, areasRaw, fornecedoresRaw] = await Promise.all([
    prisma.ciclo.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.area.findMany({
      orderBy: { nome: "asc" },
      include: {
        unidades: {
          orderBy: { nome: "asc" },
          ...(unidadeIdsVisiveis ? { where: { id: { in: unidadeIdsVisiveis } } } : {}),
        },
      },
    }),
    prisma.fornecedor.findMany({ orderBy: { nome: "asc" } }),
  ]);
  // Áreas sem nenhuma unidade visível (ex.: Gerente de Área de outra área) não aparecem.
  const areas = unidadeIdsVisiveis ? areasRaw.filter((a) => a.unidades.length > 0) : areasRaw;

  const { ciclo: cicloParam } = await searchParams;
  const cicloSelecionado = ciclos.find((c) => c.id === cicloParam) ?? ciclos[0] ?? null;

  const [metas, pedidosPagos, pedidosReservados, planejamentosAprovados, transferenciasAprovadas, verbaExtraAprovada] =
    cicloSelecionado
      ? await Promise.all([
          prisma.meta.findMany({
            where: { cicloId: cicloSelecionado.id },
            include: { fornecedor: true, atualizadoPor: true },
          }),
          prisma.pedido.groupBy({
            by: ["unidadeId"],
            where: { cicloId: cicloSelecionado.id, status: "PAGO" },
            _sum: { valorBruto: true },
          }),
          // Pedido pendente/aprovado já reserva saldo (ver calcularSaldoDisponivel em
          // lib/saldo.ts) — precisa aparecer no detalhamento pra explicar por que o saldo
          // caiu antes mesmo de qualquer pedido ser pago.
          prisma.pedido.findMany({
            where: { cicloId: cicloSelecionado.id, status: { in: ["PENDENTE", "APROVADO"] } },
            orderBy: { dataSolicitacao: "desc" },
          }),
          // Planejamento totalmente aprovado (Área + Regional) também reserva o valor
          // preventivamente, antes de virar pedido de fato.
          prisma.planejamento.findMany({
            where: { cicloId: cicloSelecionado.id, statusGeral: "APROVADO" },
            include: { tipoPlanejamento: true },
            orderBy: { dataSolicitacao: "desc" },
          }),
          prisma.transferenciaSaldo.findMany({
            where: { cicloId: cicloSelecionado.id, status: "APROVADA" },
            include: { unidadeOrigem: true, unidadeDestino: true, aprovadoPor: true },
          }),
          prisma.solicitacaoVerbaExtra.findMany({
            where: { cicloId: cicloSelecionado.id, status: "APROVADO" },
            include: { unidade: true, analisadoPor: true },
          }),
        ])
      : [[], [], [], [], [], []];
  const metasPorUnidade = new Map(metas.map((m) => [m.unidadeId, m]));
  const realizadoPorUnidade = new Map(pedidosPagos.map((p) => [p.unidadeId, Number(p._sum.valorBruto ?? 0)]));

  const reservadoDetalhePorUnidade = new Map<
    string,
    { servico: string; valor: number; status: string; data: string | null }[]
  >();
  for (const p of pedidosReservados) {
    const lista = reservadoDetalhePorUnidade.get(p.unidadeId) ?? [];
    lista.push({
      servico: p.servico,
      valor: Number(p.valorBruto),
      status: p.status,
      data: toIso(p.dataSolicitacao),
    });
    reservadoDetalhePorUnidade.set(p.unidadeId, lista);
  }

  const planejamentoDetalhePorUnidade = new Map<string, { tipoNome: string; valor: number; data: string | null }[]>();
  for (const p of planejamentosAprovados) {
    const lista = planejamentoDetalhePorUnidade.get(p.unidadeId) ?? [];
    lista.push({ tipoNome: p.tipoPlanejamento.nome, valor: Number(p.valor), data: toIso(p.dataSolicitacao) });
    planejamentoDetalhePorUnidade.set(p.unidadeId, lista);
  }

  // Detalhamento item a item de cada entrada/saída de saldo — é isso que a tela mostra
  // no drawer "Detalhar saldo", já que a soma sozinha (ex.: +R$ 10.000 de transferência,
  // +R$ 20.000 de verba extra) deixava o salto do orçado pro saldo final sem explicação.
  const saidaDetalhePorUnidade = new Map<
    string,
    { unidadeNome: string; valor: number; data: string | null; aprovadoPorNome: string | null }[]
  >();
  const entradaDetalhePorUnidade = new Map<
    string,
    { unidadeNome: string; valor: number; data: string | null; aprovadoPorNome: string | null }[]
  >();
  for (const t of transferenciasAprovadas) {
    const valor = Number(t.valor);
    const data = toIso(t.dataDecisao ?? t.dataSolicitacao);
    const aprovadoPorNome = t.aprovadoPor?.nome ?? null;
    const listaSaida = saidaDetalhePorUnidade.get(t.unidadeOrigemId) ?? [];
    listaSaida.push({ unidadeNome: t.unidadeDestino.nome, valor, data, aprovadoPorNome });
    saidaDetalhePorUnidade.set(t.unidadeOrigemId, listaSaida);

    const listaEntrada = entradaDetalhePorUnidade.get(t.unidadeDestinoId) ?? [];
    listaEntrada.push({ unidadeNome: t.unidadeOrigem.nome, valor, data, aprovadoPorNome });
    entradaDetalhePorUnidade.set(t.unidadeDestinoId, listaEntrada);
  }

  const verbaExtraDetalhePorUnidade = new Map<
    string,
    { motivo: string; valor: number; data: string | null; analisadoPorNome: string | null }[]
  >();
  for (const v of verbaExtraAprovada) {
    const lista = verbaExtraDetalhePorUnidade.get(v.unidadeId) ?? [];
    lista.push({
      motivo: v.motivo,
      valor: Number(v.valor),
      data: toIso(v.dataAnalise ?? v.dataSolicitacao),
      analisadoPorNome: v.analisadoPor?.nome ?? null,
    });
    verbaExtraDetalhePorUnidade.set(v.unidadeId, lista);
  }

  function somar(lista: { valor: number }[] | undefined): number {
    return (lista ?? []).reduce((soma, item) => soma + item.valor, 0);
  }

  const linhas: MetaRow[] = areas.flatMap((area) =>
    area.unidades.map((unidade) => {
      const meta = metasPorUnidade.get(unidade.id);
      const transferenciasEntradaDetalhe = entradaDetalhePorUnidade.get(unidade.id) ?? [];
      const transferenciasSaidaDetalhe = saidaDetalhePorUnidade.get(unidade.id) ?? [];
      const verbaExtraDetalhe = verbaExtraDetalhePorUnidade.get(unidade.id) ?? [];
      const reservadoDetalhe = reservadoDetalhePorUnidade.get(unidade.id) ?? [];
      const planejamentoDetalhe = planejamentoDetalhePorUnidade.get(unidade.id) ?? [];
      return {
        unidadeId: unidade.id,
        unidadeNome: unidade.nome,
        areaNome: area.nome,
        fornecedorId: meta?.fornecedorId ?? null,
        fornecedorNome: meta?.fornecedor?.nome ?? null,
        metaBuPresencial: meta?.metaBuPresencial ?? null,
        metaBuDigital: meta?.metaBuDigital ?? null,
        verbaOrcada: meta ? Number(meta.verbaOrcada) : null,
        verbaOrcadaPorNome: meta?.atualizadoPor?.nome ?? null,
        realizado: realizadoPorUnidade.get(unidade.id) ?? 0,
        reservado: somar(reservadoDetalhe) + somar(planejamentoDetalhe),
        transferenciasSaldo: somar(transferenciasEntradaDetalhe) - somar(transferenciasSaidaDetalhe),
        verbaExtra: somar(verbaExtraDetalhe),
        transferenciasEntradaDetalhe,
        transferenciasSaidaDetalhe,
        verbaExtraDetalhe,
        reservadoDetalhe,
        planejamentoDetalhe,
        observacoes: meta?.observacoes ?? null,
      };
    }),
  );

  // Card de resumo por área não faz sentido para Gerente de Unidade/Comercial: eles só
  // veem a(s) unidade(s) que gerenciam, e a tabela abaixo já mostra os mesmos números por linha.
  const agregadosPorArea: AreaAgregado[] =
    session.perfil === "GERENTE_UNIDADE" || session.perfil === "GERENTE_COMERCIAL"
      ? []
      : areas.map((area) => {
          const linhasDaArea = linhas.filter((l) => l.areaNome === area.nome);
          const totalOrcado = linhasDaArea.reduce((soma, l) => soma + (l.verbaOrcada ?? 0), 0);
          const totalRealizado = linhasDaArea.reduce((soma, l) => soma + l.realizado, 0);
          const totalReservado = linhasDaArea.reduce((soma, l) => soma + l.reservado, 0);
          const totalVerbaExtra = linhasDaArea.reduce((soma, l) => soma + l.verbaExtra, 0);
          const totalSaldo = linhasDaArea.reduce(
            (soma, l) =>
              soma +
              (l.verbaOrcada === null
                ? 0
                : l.verbaOrcada - l.realizado - l.reservado + l.transferenciasSaldo + l.verbaExtra),
            0,
          );
          return { areaNome: area.nome, totalOrcado, totalRealizado, totalReservado, totalSaldo, totalVerbaExtra };
        });

  const fornecedores = fornecedoresRaw.map((f) => ({
    id: f.id,
    nome: f.nome,
    bvPct: f.bvPct !== null ? Number(f.bvPct) : null,
    taxaPct: f.taxaPct !== null ? Number(f.taxaPct) : null,
  }));

  return (
    <MetasClient
      ciclos={ciclos.map((c) => ({ id: c.id, nome: c.nome }))}
      cicloSelecionadoId={cicloSelecionado?.id ?? ""}
      cicloSelecionadoNome={cicloSelecionado?.nome ?? ""}
      linhas={linhas}
      agregadosPorArea={agregadosPorArea}
      fornecedores={fornecedores}
      podeEditar={podeEditar}
    />
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "@/components/SlideOver";
import { Select } from "@/components/Select";
import { PedidoForm } from "./PedidoForm";
import { DecisaoForm } from "./DecisaoForm";
import { PagamentoForm } from "./PagamentoForm";
import { criarPedido, decidirPedido, marcarComoPago } from "./actions";

export type PedidoRow = {
  id: string;
  unidadeNome: string;
  areaNome: string;
  fornecedorNome: string;
  servico: string;
  dataDesejada: string;
  valorLiquido: number;
  bv: number;
  taxa: number;
  valorBruto: number;
  status: "PENDENTE" | "APROVADO" | "REJEITADO" | "PAGO";
  eventos: {
    tipo: "PENDENTE" | "APROVADO" | "REJEITADO" | "PAGO";
    usuarioNome: string;
    dataHora: string;
    comentario: string | null;
  }[];
};

type Drawer = { type: "novo" } | { type: "detalhe"; pedido: PedidoRow } | null;

const STATUS_LABEL: Record<PedidoRow["status"], string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
  PAGO: "Pago",
};

const STATUS_DOT: Record<PedidoRow["status"], string> = {
  PENDENTE: "bg-muted",
  APROVADO: "bg-cyan-deep",
  REJEITADO: "bg-error",
  PAGO: "bg-green",
};

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatDateHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const EVENTO_LABEL: Record<PedidoRow["status"], string> = {
  PENDENTE: "Solicitado",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
  PAGO: "Marcado como pago",
};

const EVENTO_DOT: Record<PedidoRow["status"], string> = {
  PENDENTE: "bg-muted",
  APROVADO: "bg-cyan-deep",
  REJEITADO: "bg-error",
  PAGO: "bg-green",
};

export function PedidosClient({
  ciclos,
  cicloSelecionadoId,
  linhas,
  unidadesParaCriar,
  podeCriar,
  podeDecidir,
  podePagar,
  podeVerFinanceiro,
}: {
  ciclos: { id: string; nome: string }[];
  cicloSelecionadoId: string;
  linhas: PedidoRow[];
  unidadesParaCriar: {
    id: string;
    nome: string;
    areaNome: string;
    bvPct: number | null;
    taxaPct: number | null;
    saldoDisponivel: number | null;
  }[];
  podeCriar: boolean;
  podeDecidir: boolean;
  podePagar: boolean;
  podeVerFinanceiro: boolean;
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  function closeDrawer() {
    setDrawer(null);
    setHistoricoAberto(false);
  }

  function handleSuccess() {
    setDrawer(null);
    router.refresh();
  }

  function trocarCiclo(cicloId: string) {
    router.push(`/pedidos?ciclo=${cicloId}`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-muted">Verba</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy">Pedidos</h1>
          </div>
          <div className="flex items-end gap-4">
            <div className="w-56 space-y-1.5">
              <p className="text-sm font-medium text-navy">Ciclo</p>
              <Select
                name="cicloId"
                options={ciclos.map((c) => ({ value: c.id, label: c.nome }))}
                defaultValue={cicloSelecionadoId}
                onChange={trocarCiclo}
              />
            </div>
            {podeCriar ? (
              <button
                type="button"
                onClick={() => setDrawer({ type: "novo" })}
                className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90"
              >
                + Novo pedido
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-8 pb-10">
        {ciclos.length === 0 ? (
          <p className="rounded-md border border-border px-5 py-4 text-[0.9375rem] text-muted">
            Nenhum ciclo cadastrado ainda.
          </p>
        ) : linhas.length === 0 ? (
          <p className="rounded-md border border-border px-5 py-4 text-[0.9375rem] text-muted">
            Nenhum pedido neste ciclo ainda.
          </p>
        ) : (
          <div className="h-full overflow-y-auto rounded-md border border-border">
            <table className="w-full border-separate border-spacing-0 text-left text-[0.875rem]">
              <thead>
                <tr className="sticky top-0 z-10 bg-background text-muted">
                  <th className="border-b border-border px-5 py-2.5 font-medium">Unidade</th>
                  {podeVerFinanceiro ? (
                    <th className="border-b border-border px-5 py-2.5 font-medium">Fornecedor</th>
                  ) : null}
                  <th className="border-b border-border px-5 py-2.5 font-medium">Serviço</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Data desejada</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Valor líquido</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Valor bruto</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Status</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((pedido) => (
                  <tr key={pedido.id} className="border-t border-border">
                    <td className="px-5 py-2.5 text-navy">{pedido.unidadeNome}</td>
                    {podeVerFinanceiro ? (
                      <td className="px-5 py-2.5 text-navy">{pedido.fornecedorNome}</td>
                    ) : null}
                    <td className="px-5 py-2.5 text-navy">{pedido.servico}</td>
                    <td className="px-5 py-2.5 text-navy">{formatDate(pedido.dataDesejada)}</td>
                    <td className="px-5 py-2.5 text-navy">{formatMoeda(pedido.valorLiquido)}</td>
                    <td className="px-5 py-2.5 text-navy">{formatMoeda(pedido.valorBruto)}</td>
                    <td className="px-5 py-2.5 text-navy">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[pedido.status]}`} />
                        {STATUS_LABEL[pedido.status]}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDrawer({ type: "detalhe", pedido })}
                        className="text-cyan-deep hover:underline"
                      >
                        {podeDecidir && (pedido.status === "PENDENTE" || pedido.status === "APROVADO")
                          ? "Analisar"
                          : "Ver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SlideOver
        open={drawer?.type === "novo" || drawer?.type === "detalhe"}
        onClose={closeDrawer}
        title={drawer?.type === "novo" ? "Novo pedido" : "Pedido"}
      >
        {drawer?.type === "novo" ? (
          <PedidoForm
            action={criarPedido}
            unidades={unidadesParaCriar}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : drawer?.type === "detalhe" ? (
          <div className="space-y-6">
            <div className="space-y-1 rounded-md border border-border bg-background px-3 py-2.5 text-[0.875rem]">
              <p>
                <span className="text-navy">{drawer.pedido.areaNome}</span> ·{" "}
                <span className="text-navy">{drawer.pedido.unidadeNome}</span>
              </p>
              {podeVerFinanceiro ? <p className="text-muted">Fornecedor: {drawer.pedido.fornecedorNome}</p> : null}
              <p className="text-muted">Serviço: {drawer.pedido.servico}</p>
              <p className="text-muted">Data desejada de pagamento: {formatDate(drawer.pedido.dataDesejada)}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[0.875rem]">
              <p className="text-muted">Valor líquido</p>
              <p className="text-right text-navy">{formatMoeda(drawer.pedido.valorLiquido)}</p>
              {podeVerFinanceiro ? (
                <>
                  <p className="text-muted">BV</p>
                  <p className="text-right text-navy">{formatMoeda(drawer.pedido.bv)}</p>
                  <p className="text-muted">Taxa</p>
                  <p className="text-right text-navy">{formatMoeda(drawer.pedido.taxa)}</p>
                </>
              ) : null}
              <p className="font-medium text-navy">Valor bruto</p>
              <p className="text-right font-medium text-navy">{formatMoeda(drawer.pedido.valorBruto)}</p>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5 text-[0.875rem]">
              <span className="inline-flex items-center gap-1.5 text-navy">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[drawer.pedido.status]}`} />
                Status atual: <span className="font-medium">{STATUS_LABEL[drawer.pedido.status]}</span>
              </span>
              <button
                type="button"
                onClick={() => setHistoricoAberto(true)}
                className="text-cyan-deep hover:underline"
              >
                Ver histórico
              </button>
            </div>

            {podeDecidir && drawer.pedido.status === "PENDENTE" ? (
              <DecisaoForm action={decidirPedido.bind(null, drawer.pedido.id)} onSuccess={handleSuccess} />
            ) : null}

            {drawer.pedido.status === "APROVADO" ? (
              <div className="space-y-4">
                {podePagar ? (
                  <PagamentoForm action={marcarComoPago.bind(null, drawer.pedido.id)} onSuccess={handleSuccess} />
                ) : null}
                {podeDecidir ? (
                  <div className={podePagar ? "border-t border-border pt-4" : ""}>
                    <p className="mb-2 text-sm font-medium text-navy">Rejeitar antes do pagamento</p>
                    <DecisaoForm
                      action={decidirPedido.bind(null, drawer.pedido.id)}
                      onSuccess={handleSuccess}
                      somenteRejeitar
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </SlideOver>

      <SlideOver open={historicoAberto} onClose={() => setHistoricoAberto(false)} title="Histórico do pedido">
        {drawer?.type === "detalhe" ? (
          <ol className="space-y-3 border-l border-border pl-4 text-[0.875rem]">
            {drawer.pedido.eventos.map((evento, i) => (
              <li key={i} className="relative">
                <span className={`absolute -left-[1.1rem] top-1 h-2 w-2 rounded-full ${EVENTO_DOT[evento.tipo]}`} />
                <p className="text-navy">
                  {EVENTO_LABEL[evento.tipo]} por <span className="font-medium">{evento.usuarioNome}</span>
                </p>
                <p className="text-muted">{formatDateHora(evento.dataHora)}</p>
                {evento.comentario ? (
                  <p className="mt-1 text-navy">
                    <span className="text-muted">Comentário:</span> {evento.comentario}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </SlideOver>
    </div>
  );
}

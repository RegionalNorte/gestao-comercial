"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "@/components/SlideOver";
import { NovoReembolsoKmForm } from "./NovoReembolsoKmForm";
import { DecisaoReembolsoKmForm } from "./DecisaoReembolsoKmForm";
import { criarReembolsoKm, decidirComercial, decidirRegional } from "./actions";

export type ReembolsoKmStatus = "PENDENTE" | "PRE_APROVADO" | "APROVADO" | "REJEITADO";

export type ReembolsoKmRow = {
  id: string;
  unidadeNome: string;
  areaNome: string;
  consultorNome: string;
  colaborador: string;
  equipe: string | null;
  periodoInicio: string;
  periodoFim: string;
  totalKm: number;
  totalValor: number;
  status: ReembolsoKmStatus;
  dataSolicitacao: string;
  eventos: {
    tipo: ReembolsoKmStatus;
    usuarioNome: string;
    dataHora: string;
    comentario: string | null;
  }[];
  itens: {
    id: string;
    data: string;
    tarefaCodigo: string;
    clientePartida: string;
    clienteChegada: string;
    km: number;
    valor: number;
    ignorado: boolean;
  }[];
};

type Drawer = { type: "novo" } | { type: "detalhe"; reembolso: ReembolsoKmRow } | null;

const STATUS_LABEL: Record<ReembolsoKmStatus, string> = {
  PENDENTE: "Pendente",
  PRE_APROVADO: "Pré-aprovado",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

const STATUS_DOT: Record<ReembolsoKmStatus, string> = {
  PENDENTE: "bg-muted",
  PRE_APROVADO: "bg-cyan",
  APROVADO: "bg-green",
  REJEITADO: "bg-error",
};

const EVENTO_LABEL: Record<ReembolsoKmStatus, string> = {
  PENDENTE: "Solicitado",
  PRE_APROVADO: "Pré-aprovado",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatKm(km: number): string {
  return `${km.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} km`;
}

function formatDate(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatDateHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ReembolsoKmClient({
  linhas,
  unidadesParaCriar,
  podeCriar,
  podeDecidirComercial,
  podeDecidirRegional,
}: {
  linhas: ReembolsoKmRow[];
  unidadesParaCriar: { id: string; nome: string; areaNome: string }[];
  podeCriar: boolean;
  podeDecidirComercial: boolean;
  podeDecidirRegional: boolean;
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [trechosAberto, setTrechosAberto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  function closeDrawer() {
    setDrawer(null);
    setHistoricoAberto(false);
    setTrechosAberto(false);
  }

  function handleSuccess(avisoRecebido?: string) {
    setDrawer(null);
    setAviso(avisoRecebido ?? null);
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-muted">Reembolso KM</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy">Pedidos</h1>
          </div>
          {podeCriar ? (
            <button
              type="button"
              onClick={() => setDrawer({ type: "novo" })}
              className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90"
            >
              + Novo reembolso
            </button>
          ) : null}
        </div>
        {aviso ? (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[0.875rem] text-amber-800">
            <p>{aviso}</p>
            <button type="button" onClick={() => setAviso(null)} className="text-amber-800 hover:underline">
              Fechar
            </button>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-8 pb-10">
        {linhas.length === 0 ? (
          <p className="rounded-md border border-border px-5 py-4 text-[0.9375rem] text-muted">
            Nenhum reembolso de KM ainda.
          </p>
        ) : (
          <div className="h-full overflow-y-auto rounded-md border border-border">
            <table className="w-full border-separate border-spacing-0 text-left text-[0.875rem]">
              <thead>
                <tr className="sticky top-0 z-10 bg-background text-muted">
                  <th className="border-b border-border px-5 py-2.5 font-medium">Unidade</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Consultor</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Período</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">KM</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Valor</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Status</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((r) => {
                  const podeAnalisar =
                    (podeDecidirComercial && r.status === "PENDENTE") ||
                    (podeDecidirRegional && r.status === "PRE_APROVADO");
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-5 py-2.5 text-navy">{r.unidadeNome}</td>
                      <td className="px-5 py-2.5 text-navy">{r.consultorNome}</td>
                      <td className="px-5 py-2.5 text-navy">
                        {formatDate(r.periodoInicio)} – {formatDate(r.periodoFim)}
                      </td>
                      <td className="px-5 py-2.5 text-navy">{formatKm(r.totalKm)}</td>
                      <td className="px-5 py-2.5 text-navy">{formatMoeda(r.totalValor)}</td>
                      <td className="px-5 py-2.5 text-navy">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status]}`} />
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setDrawer({ type: "detalhe", reembolso: r })}
                          className="text-cyan-deep hover:underline"
                        >
                          {podeAnalisar ? "Analisar" : "Ver"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SlideOver
        open={drawer?.type === "novo" || drawer?.type === "detalhe"}
        onClose={closeDrawer}
        title={drawer?.type === "novo" ? "Novo reembolso" : "Reembolso de KM"}
      >
        {drawer?.type === "novo" ? (
          <NovoReembolsoKmForm
            action={criarReembolsoKm}
            unidades={unidadesParaCriar}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : drawer?.type === "detalhe" ? (
          <div className="space-y-6">
            <div className="space-y-1 rounded-md border border-border bg-background px-3 py-2.5 text-[0.875rem]">
              <p>
                <span className="text-navy">{drawer.reembolso.areaNome}</span> ·{" "}
                <span className="text-navy">{drawer.reembolso.unidadeNome}</span>
              </p>
              <p className="text-muted">Consultor: {drawer.reembolso.consultorNome}</p>
              <p className="text-muted">
                Colaborador (do relatório): {drawer.reembolso.colaborador}
                {drawer.reembolso.equipe ? ` · ${drawer.reembolso.equipe}` : ""}
              </p>
              <p className="text-muted">
                Período: {formatDate(drawer.reembolso.periodoInicio)} – {formatDate(drawer.reembolso.periodoFim)}
              </p>
              <a
                href={`/reembolso-km/${drawer.reembolso.id}/pdf`}
                className="inline-block text-cyan-deep hover:underline"
              >
                Baixar PDF do relatório
              </a>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[0.875rem]">
              <p className="text-muted">Total KM</p>
              <p className="text-right text-navy">{formatKm(drawer.reembolso.totalKm)}</p>
              <p className="font-medium text-navy">Valor total</p>
              <p className="text-right font-medium text-navy">{formatMoeda(drawer.reembolso.totalValor)}</p>
            </div>

            <button
              type="button"
              onClick={() => setTrechosAberto(true)}
              className="w-full rounded-md border border-border px-3 py-2.5 text-left text-[0.875rem] text-cyan-deep hover:underline"
            >
              Ver detalhamento por trecho ({drawer.reembolso.itens.length})
            </button>

            <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5 text-[0.875rem]">
              <span className="inline-flex items-center gap-1.5 text-navy">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[drawer.reembolso.status]}`} />
                Status atual: <span className="font-medium">{STATUS_LABEL[drawer.reembolso.status]}</span>
              </span>
              <button type="button" onClick={() => setHistoricoAberto(true)} className="text-cyan-deep hover:underline">
                Ver histórico
              </button>
            </div>

            {podeDecidirComercial && drawer.reembolso.status === "PENDENTE" ? (
              <DecisaoReembolsoKmForm action={decidirComercial.bind(null, drawer.reembolso.id)} onSuccess={handleSuccess} />
            ) : null}
            {podeDecidirRegional && drawer.reembolso.status === "PRE_APROVADO" ? (
              <DecisaoReembolsoKmForm action={decidirRegional.bind(null, drawer.reembolso.id)} onSuccess={handleSuccess} />
            ) : null}
          </div>
        ) : null}
      </SlideOver>

      <SlideOver open={historicoAberto} onClose={() => setHistoricoAberto(false)} title="Histórico do reembolso">
        {drawer?.type === "detalhe" ? (
          <ol className="space-y-3 border-l border-border pl-4 text-[0.875rem]">
            {drawer.reembolso.eventos.map((evento, i) => (
              <li key={i} className="relative">
                <span className={`absolute -left-[1.1rem] top-1 h-2 w-2 rounded-full ${STATUS_DOT[evento.tipo]}`} />
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

      <SlideOver open={trechosAberto} onClose={() => setTrechosAberto(false)} title="Detalhamento por trecho">
        {drawer?.type === "detalhe" ? (
          <div className="space-y-3 text-[0.875rem]">
            {drawer.reembolso.itens.map((item) => (
              <div
                key={item.id}
                className={`rounded-md border p-3 ${
                  item.ignorado ? "border-amber-200 bg-amber-50" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${item.ignorado ? "text-amber-800" : "text-navy"}`}>
                    {formatDate(item.data)}
                  </span>
                  <span className="text-muted">Tarefa {item.tarefaCodigo}</span>
                </div>
                <p className={`mt-1 ${item.ignorado ? "text-amber-800" : "text-navy"}`}>
                  <span className="text-muted">De:</span> {item.clientePartida}
                </p>
                <p className={item.ignorado ? "text-amber-800" : "text-navy"}>
                  <span className="text-muted">Para:</span> {item.clienteChegada}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className={item.ignorado ? "text-amber-800" : "text-navy"}>{formatKm(item.km)}</span>
                  <span className={`font-medium ${item.ignorado ? "text-amber-800" : "text-navy"}`}>
                    {formatMoeda(item.valor)}
                  </span>
                </div>
                {item.ignorado ? (
                  <p className="mt-1.5 text-[0.8125rem] text-amber-700">
                    Já coberto por outra solicitação — não entrou no total desta.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </SlideOver>
    </div>
  );
}

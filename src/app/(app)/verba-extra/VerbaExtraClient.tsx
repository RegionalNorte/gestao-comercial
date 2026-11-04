"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "@/components/SlideOver";
import { Select } from "@/components/Select";
import { SolicitacaoExtraForm } from "./SolicitacaoExtraForm";
import { DecisaoExtraForm } from "./DecisaoExtraForm";
import { criarSolicitacaoExtra, decidirSolicitacaoExtra } from "./actions";

export type SolicitacaoExtraRow = {
  id: string;
  areaNome: string;
  unidadeNome: string;
  valor: number;
  motivo: string;
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
  solicitadoPorNome: string;
  dataSolicitacao: string;
  analisadoPorNome: string | null;
  dataAnalise: string | null;
  comentarioAnalista: string | null;
};

type Drawer = { type: "nova" } | { type: "detalhe"; solicitacao: SolicitacaoExtraRow } | null;

const STATUS_LABEL: Record<SolicitacaoExtraRow["status"], string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

const STATUS_DOT: Record<SolicitacaoExtraRow["status"], string> = {
  PENDENTE: "bg-muted",
  APROVADO: "bg-green",
  REJEITADO: "bg-error",
};

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function VerbaExtraClient({
  ciclos,
  cicloSelecionadoId,
  linhas,
  unidades,
  podeCriar,
  podeDecidir,
}: {
  ciclos: { id: string; nome: string }[];
  cicloSelecionadoId: string;
  linhas: SolicitacaoExtraRow[];
  unidades: { id: string; nome: string; areaNome: string }[];
  podeCriar: boolean;
  podeDecidir: boolean;
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<Drawer>(null);

  function closeDrawer() {
    setDrawer(null);
  }

  function handleSuccess() {
    setDrawer(null);
    router.refresh();
  }

  function trocarCiclo(cicloId: string) {
    router.push(`/verba-extra?ciclo=${cicloId}`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-muted">Verba</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy">Verba Extra</h1>
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
                onClick={() => setDrawer({ type: "nova" })}
                className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90"
              >
                + Nova solicitação
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
            Nenhuma solicitação de verba extra neste ciclo ainda.
          </p>
        ) : (
          <div className="h-full overflow-y-auto rounded-md border border-border">
            <table className="w-full border-separate border-spacing-0 text-left text-[0.875rem]">
              <thead>
                <tr className="sticky top-0 z-10 bg-background text-muted">
                  <th className="border-b border-border px-5 py-2.5 font-medium">Unidade</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Motivo</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Valor</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Status</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((solicitacao) => (
                  <tr key={solicitacao.id} className="border-t border-border">
                    <td className="px-5 py-2.5 text-navy">
                      {solicitacao.areaNome} · {solicitacao.unidadeNome}
                    </td>
                    <td className="px-5 py-2.5 text-navy">{solicitacao.motivo}</td>
                    <td className="px-5 py-2.5 text-navy">{formatMoeda(solicitacao.valor)}</td>
                    <td className="px-5 py-2.5 text-navy">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[solicitacao.status]}`} />
                        {STATUS_LABEL[solicitacao.status]}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDrawer({ type: "detalhe", solicitacao })}
                        className="text-cyan-deep hover:underline"
                      >
                        {podeDecidir && solicitacao.status === "PENDENTE" ? "Analisar" : "Ver"}
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
        open={drawer?.type === "nova" || drawer?.type === "detalhe"}
        onClose={closeDrawer}
        title={drawer?.type === "nova" ? "Nova solicitação de verba extra" : "Verba extra"}
      >
        {drawer?.type === "nova" ? (
          <SolicitacaoExtraForm
            action={criarSolicitacaoExtra.bind(null, cicloSelecionadoId)}
            unidades={unidades}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : drawer?.type === "detalhe" ? (
          <div className="space-y-6">
            <div className="space-y-1 rounded-md border border-border bg-background px-3 py-2.5 text-[0.875rem]">
              <p>
                <span className="text-navy">{drawer.solicitacao.areaNome}</span> ·{" "}
                <span className="text-navy">{drawer.solicitacao.unidadeNome}</span>
              </p>
              <p className="text-muted">Motivo: {drawer.solicitacao.motivo}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[0.875rem]">
              <p className="font-medium text-navy">Valor</p>
              <p className="text-right font-medium text-navy">{formatMoeda(drawer.solicitacao.valor)}</p>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5 text-[0.875rem]">
              <span className="inline-flex items-center gap-1.5 text-navy">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[drawer.solicitacao.status]}`} />
                Status atual: <span className="font-medium">{STATUS_LABEL[drawer.solicitacao.status]}</span>
              </span>
            </div>

            <div className="space-y-2 text-[0.875rem]">
              <p className="text-navy">
                Solicitado por <span className="font-medium">{drawer.solicitacao.solicitadoPorNome}</span>
              </p>
              <p className="text-muted">{formatDateHora(drawer.solicitacao.dataSolicitacao)}</p>
              {drawer.solicitacao.analisadoPorNome ? (
                <>
                  <p className="text-navy">
                    {drawer.solicitacao.status === "REJEITADO" ? "Rejeitado" : "Aprovado"} por{" "}
                    <span className="font-medium">{drawer.solicitacao.analisadoPorNome}</span>
                  </p>
                  <p className="text-muted">
                    {drawer.solicitacao.dataAnalise ? formatDateHora(drawer.solicitacao.dataAnalise) : null}
                  </p>
                </>
              ) : null}
              {drawer.solicitacao.comentarioAnalista ? (
                <p className="text-navy">
                  <span className="text-muted">Comentário:</span> {drawer.solicitacao.comentarioAnalista}
                </p>
              ) : null}
            </div>

            {podeDecidir && drawer.solicitacao.status === "PENDENTE" ? (
              <DecisaoExtraForm
                action={decidirSolicitacaoExtra.bind(null, drawer.solicitacao.id)}
                onSuccess={handleSuccess}
              />
            ) : null}
          </div>
        ) : null}
      </SlideOver>
    </div>
  );
}

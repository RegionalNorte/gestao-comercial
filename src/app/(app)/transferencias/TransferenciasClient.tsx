"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "@/components/SlideOver";
import { Select } from "@/components/Select";
import { TransferenciaForm } from "./TransferenciaForm";
import { DecisaoTransferenciaForm } from "./DecisaoTransferenciaForm";
import { criarTransferencia, decidirTransferencia } from "./actions";

export type TransferenciaRow = {
  id: string;
  areaOrigemNome: string;
  unidadeOrigemNome: string;
  areaDestinoNome: string;
  unidadeDestinoNome: string;
  valor: number;
  tipo: "INTRA_AREA" | "ENTRE_AREAS";
  status: "PENDENTE" | "APROVADA" | "NEGADA";
  solicitadoPorNome: string;
  dataSolicitacao: string;
  aprovadoPorNome: string | null;
  dataDecisao: string | null;
  observacao: string | null;
  podeDecidir: boolean;
};

type Drawer = { type: "nova" } | { type: "detalhe"; transferencia: TransferenciaRow } | null;

const TIPO_LABEL: Record<TransferenciaRow["tipo"], string> = {
  INTRA_AREA: "Intra-área",
  ENTRE_AREAS: "Entre áreas",
};

const STATUS_LABEL: Record<TransferenciaRow["status"], string> = {
  PENDENTE: "Pendente",
  APROVADA: "Aprovada",
  NEGADA: "Negada",
};

const STATUS_DOT: Record<TransferenciaRow["status"], string> = {
  PENDENTE: "bg-muted",
  APROVADA: "bg-green",
  NEGADA: "bg-error",
};

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function TransferenciasClient({
  ciclos,
  cicloSelecionadoId,
  linhas,
  unidadesOrigem,
  unidadesDestino,
  podeCriar,
}: {
  ciclos: { id: string; nome: string }[];
  cicloSelecionadoId: string;
  linhas: TransferenciaRow[];
  unidadesOrigem: { id: string; nome: string; areaNome: string }[];
  unidadesDestino: { id: string; nome: string; areaNome: string }[];
  podeCriar: boolean;
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
    router.push(`/transferencias?ciclo=${cicloId}`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-muted">Verba</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy">Transferências de Saldo</h1>
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
                + Nova transferência
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
            Nenhuma transferência neste ciclo ainda.
          </p>
        ) : (
          <div className="h-full overflow-y-auto rounded-md border border-border">
            <table className="w-full border-separate border-spacing-0 text-left text-[0.875rem]">
              <thead>
                <tr className="sticky top-0 z-10 bg-background text-muted">
                  <th className="border-b border-border px-5 py-2.5 font-medium">Origem</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Destino</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Valor</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Tipo</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Status</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((transferencia) => (
                  <tr key={transferencia.id} className="border-t border-border">
                    <td className="px-5 py-2.5 text-navy">
                      {transferencia.areaOrigemNome} · {transferencia.unidadeOrigemNome}
                    </td>
                    <td className="px-5 py-2.5 text-navy">
                      {transferencia.areaDestinoNome} · {transferencia.unidadeDestinoNome}
                    </td>
                    <td className="px-5 py-2.5 text-navy">{formatMoeda(transferencia.valor)}</td>
                    <td className="px-5 py-2.5 text-navy">{TIPO_LABEL[transferencia.tipo]}</td>
                    <td className="px-5 py-2.5 text-navy">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[transferencia.status]}`} />
                        {STATUS_LABEL[transferencia.status]}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDrawer({ type: "detalhe", transferencia })}
                        className="text-cyan-deep hover:underline"
                      >
                        {transferencia.podeDecidir && transferencia.status === "PENDENTE" ? "Decidir" : "Ver"}
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
        title={drawer?.type === "nova" ? "Nova transferência" : "Transferência"}
      >
        {drawer?.type === "nova" ? (
          <TransferenciaForm
            action={criarTransferencia.bind(null, cicloSelecionadoId)}
            unidadesOrigem={unidadesOrigem}
            unidadesDestino={unidadesDestino}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : drawer?.type === "detalhe" ? (
          <div className="space-y-6">
            <div className="space-y-1 rounded-md border border-border bg-background px-3 py-2.5 text-[0.875rem]">
              <p>
                <span className="text-muted">Origem:</span>{" "}
                <span className="text-navy">
                  {drawer.transferencia.areaOrigemNome} · {drawer.transferencia.unidadeOrigemNome}
                </span>
              </p>
              <p>
                <span className="text-muted">Destino:</span>{" "}
                <span className="text-navy">
                  {drawer.transferencia.areaDestinoNome} · {drawer.transferencia.unidadeDestinoNome}
                </span>
              </p>
              <p className="text-muted">Tipo: {TIPO_LABEL[drawer.transferencia.tipo]}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[0.875rem]">
              <p className="font-medium text-navy">Valor</p>
              <p className="text-right font-medium text-navy">{formatMoeda(drawer.transferencia.valor)}</p>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5 text-[0.875rem]">
              <span className="inline-flex items-center gap-1.5 text-navy">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[drawer.transferencia.status]}`} />
                Status atual: <span className="font-medium">{STATUS_LABEL[drawer.transferencia.status]}</span>
              </span>
            </div>

            <div className="space-y-2 text-[0.875rem]">
              <p className="text-navy">
                Solicitado por <span className="font-medium">{drawer.transferencia.solicitadoPorNome}</span>
              </p>
              <p className="text-muted">{formatDateHora(drawer.transferencia.dataSolicitacao)}</p>
              {drawer.transferencia.aprovadoPorNome ? (
                <>
                  <p className="text-navy">
                    {drawer.transferencia.status === "NEGADA" ? "Negada" : "Aprovada"} por{" "}
                    <span className="font-medium">{drawer.transferencia.aprovadoPorNome}</span>
                  </p>
                  <p className="text-muted">
                    {drawer.transferencia.dataDecisao ? formatDateHora(drawer.transferencia.dataDecisao) : null}
                  </p>
                </>
              ) : null}
              {drawer.transferencia.observacao ? (
                <p className="text-navy">
                  <span className="text-muted">Observação:</span> {drawer.transferencia.observacao}
                </p>
              ) : null}
            </div>

            {drawer.transferencia.podeDecidir && drawer.transferencia.status === "PENDENTE" ? (
              <DecisaoTransferenciaForm
                action={decidirTransferencia.bind(null, drawer.transferencia.id)}
                onSuccess={handleSuccess}
              />
            ) : null}
          </div>
        ) : null}
      </SlideOver>
    </div>
  );
}

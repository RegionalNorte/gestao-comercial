"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlideOver } from "@/components/SlideOver";
import { Select } from "@/components/Select";
import { PlanejamentoForm } from "./PlanejamentoForm";
import { DecisaoPlanejamentoForm } from "./DecisaoPlanejamentoForm";
import { TiposPlanejamentoForm } from "./TiposPlanejamentoForm";
import {
  criarPlanejamento,
  decidirPlanejamentoArea,
  decidirPlanejamentoRegional,
  criarTipoPlanejamento,
  alternarAtivoTipoPlanejamento,
} from "./actions";

type StatusDecisao = "PENDENTE" | "APROVADO" | "REJEITADO";

export type PlanejamentoRow = {
  id: string;
  areaNome: string;
  unidadeNome: string;
  tipoNome: string;
  valor: number;
  observacao: string | null;
  statusGeral: StatusDecisao;
  decisaoAreaStatus: StatusDecisao;
  decisaoAreaPorNome: string | null;
  decisaoAreaEm: string | null;
  decisaoRegionalStatus: StatusDecisao;
  decisaoRegionalPorNome: string | null;
  decisaoRegionalEm: string | null;
  solicitadoPorNome: string;
  dataSolicitacao: string;
};

export type TipoPlanejamentoRow = { id: string; nome: string; ativo: boolean };

type Drawer = { type: "nova" } | { type: "detalhe"; linha: PlanejamentoRow } | { type: "tipos" } | null;

const STATUS_LABEL: Record<StatusDecisao, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

const STATUS_DOT: Record<StatusDecisao, string> = {
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

function StatusBadge({ status }: { status: StatusDecisao }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PlanejamentoClient({
  ciclos,
  cicloSelecionadoId,
  linhas,
  unidadesParaCriar,
  tipos,
  todosTipos,
  podeCriar,
  podeDecidirArea,
  podeDecidirRegional,
  podeGerenciarTipos,
}: {
  ciclos: { id: string; nome: string }[];
  cicloSelecionadoId: string;
  linhas: PlanejamentoRow[];
  unidadesParaCriar: { id: string; nome: string; areaNome: string }[];
  tipos: { id: string; nome: string }[];
  todosTipos: TipoPlanejamentoRow[];
  podeCriar: boolean;
  podeDecidirArea: boolean;
  podeDecidirRegional: boolean;
  podeGerenciarTipos: boolean;
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
    router.push(`/planejamento?ciclo=${cicloId}`);
  }

  function handleAlternarAtivo(tipoId: string) {
    alternarAtivoTipoPlanejamento(tipoId).then(() => router.refresh());
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-muted">Verba</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy">Planejamento</h1>
            <p className="mt-1 text-[0.8125rem] text-muted">Somente para ciclos do segundo semestre (ex.: 27.2).</p>
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
            {podeGerenciarTipos ? (
              <button
                type="button"
                onClick={() => setDrawer({ type: "tipos" })}
                className="rounded-md border border-border px-4 py-2.5 text-[0.9375rem] font-medium text-navy transition-colors hover:bg-background"
              >
                Tipos de planejamento
              </button>
            ) : null}
            {podeCriar ? (
              <button
                type="button"
                onClick={() => setDrawer({ type: "nova" })}
                className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90"
              >
                + Novo planejamento
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-8 pb-10">
        {ciclos.length === 0 ? (
          <p className="rounded-md border border-border px-5 py-4 text-[0.9375rem] text-muted">
            Nenhum ciclo do segundo semestre (terminando em &quot;.2&quot;, ex.: 27.2) cadastrado ainda. Planejamento só
            se aplica a esse ciclo.
          </p>
        ) : linhas.length === 0 ? (
          <p className="rounded-md border border-border px-5 py-4 text-[0.9375rem] text-muted">
            Nenhum planejamento neste ciclo ainda.
          </p>
        ) : (
          <div className="h-full overflow-y-auto rounded-md border border-border">
            <table className="w-full border-separate border-spacing-0 text-left text-[0.875rem]">
              <thead>
                <tr className="sticky top-0 z-10 bg-background text-muted">
                  <th className="border-b border-border px-5 py-2.5 font-medium">Unidade</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Tipo</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Valor</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Decisão Área</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Decisão Regional</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Status geral</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <tr key={linha.id} className="border-t border-border">
                    <td className="px-5 py-2.5 text-navy">
                      {linha.areaNome} · {linha.unidadeNome}
                    </td>
                    <td className="px-5 py-2.5 text-navy">{linha.tipoNome}</td>
                    <td className="px-5 py-2.5 text-navy">{formatMoeda(linha.valor)}</td>
                    <td className="px-5 py-2.5 text-navy">
                      <StatusBadge status={linha.decisaoAreaStatus} />
                    </td>
                    <td className="px-5 py-2.5 text-navy">
                      <StatusBadge status={linha.decisaoRegionalStatus} />
                    </td>
                    <td className="px-5 py-2.5 text-navy">
                      <StatusBadge status={linha.statusGeral} />
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDrawer({ type: "detalhe", linha })}
                        className="text-cyan-deep hover:underline"
                      >
                        {(podeDecidirArea && linha.decisaoAreaStatus === "PENDENTE" && linha.statusGeral === "PENDENTE") ||
                        (podeDecidirRegional && linha.decisaoRegionalStatus === "PENDENTE" && linha.statusGeral === "PENDENTE")
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
        open={drawer?.type === "nova" || drawer?.type === "detalhe"}
        onClose={closeDrawer}
        title={drawer?.type === "nova" ? "Novo planejamento" : "Planejamento"}
      >
        {drawer?.type === "nova" ? (
          <PlanejamentoForm
            action={criarPlanejamento.bind(null, cicloSelecionadoId)}
            unidades={unidadesParaCriar}
            tipos={tipos}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : drawer?.type === "detalhe" ? (
          <div className="space-y-6">
            <div className="space-y-1 rounded-md border border-border bg-background px-3 py-2.5 text-[0.875rem]">
              <p>
                <span className="text-navy">{drawer.linha.areaNome}</span> ·{" "}
                <span className="text-navy">{drawer.linha.unidadeNome}</span>
              </p>
              <p className="text-muted">Tipo: {drawer.linha.tipoNome}</p>
              {drawer.linha.observacao ? <p className="text-muted">Observação: {drawer.linha.observacao}</p> : null}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[0.875rem]">
              <p className="font-medium text-navy">Valor</p>
              <p className="text-right font-medium text-navy">{formatMoeda(drawer.linha.valor)}</p>
            </div>

            <div className="space-y-2 text-[0.875rem]">
              <p className="text-navy">
                Solicitado por <span className="font-medium">{drawer.linha.solicitadoPorNome}</span>
              </p>
              <p className="text-muted">{formatDateHora(drawer.linha.dataSolicitacao)}</p>
            </div>

            <div className="space-y-3 rounded-md border border-border bg-background px-3 py-2.5 text-[0.875rem]">
              <div className="flex items-center justify-between">
                <span className="text-navy">Decisão do Gerente de Área</span>
                <StatusBadge status={drawer.linha.decisaoAreaStatus} />
              </div>
              {drawer.linha.decisaoAreaPorNome ? (
                <p className="text-muted">
                  {drawer.linha.decisaoAreaPorNome} ·{" "}
                  {drawer.linha.decisaoAreaEm ? formatDateHora(drawer.linha.decisaoAreaEm) : ""}
                </p>
              ) : null}

              <div className="flex items-center justify-between">
                <span className="text-navy">Decisão do Gerente Regional</span>
                <StatusBadge status={drawer.linha.decisaoRegionalStatus} />
              </div>
              {drawer.linha.decisaoRegionalPorNome ? (
                <p className="text-muted">
                  {drawer.linha.decisaoRegionalPorNome} ·{" "}
                  {drawer.linha.decisaoRegionalEm ? formatDateHora(drawer.linha.decisaoRegionalEm) : ""}
                </p>
              ) : null}

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-medium text-navy">Status geral</span>
                <StatusBadge status={drawer.linha.statusGeral} />
              </div>
            </div>

            {podeDecidirArea && drawer.linha.decisaoAreaStatus === "PENDENTE" && drawer.linha.statusGeral === "PENDENTE" ? (
              <DecisaoPlanejamentoForm
                action={decidirPlanejamentoArea.bind(null, drawer.linha.id)}
                titulo="Sua decisão como Gerente de Área"
                onSuccess={handleSuccess}
              />
            ) : null}

            {podeDecidirRegional &&
            drawer.linha.decisaoRegionalStatus === "PENDENTE" &&
            drawer.linha.statusGeral === "PENDENTE" ? (
              <DecisaoPlanejamentoForm
                action={decidirPlanejamentoRegional.bind(null, drawer.linha.id)}
                titulo="Sua decisão como Gerente Regional"
                onSuccess={handleSuccess}
              />
            ) : null}
          </div>
        ) : null}
      </SlideOver>

      <SlideOver open={drawer?.type === "tipos"} onClose={closeDrawer} title="Tipos de planejamento">
        <div className="space-y-6">
          <TiposPlanejamentoForm action={criarTipoPlanejamento} onSuccess={() => router.refresh()} />

          {todosTipos.length === 0 ? (
            <p className="text-[0.8125rem] text-muted">Nenhum tipo cadastrado ainda.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {todosTipos.map((tipo) => (
                <li key={tipo.id} className="flex items-center justify-between px-3 py-2.5 text-[0.875rem]">
                  <span className={tipo.ativo ? "text-navy" : "text-muted line-through"}>{tipo.nome}</span>
                  <button
                    type="button"
                    onClick={() => handleAlternarAtivo(tipo.id)}
                    className="text-cyan-deep hover:underline"
                  >
                    {tipo.ativo ? "Desativar" : "Ativar"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SlideOver>
    </div>
  );
}

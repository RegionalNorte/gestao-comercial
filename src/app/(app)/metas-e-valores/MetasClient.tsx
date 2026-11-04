"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { SlideOver } from "@/components/SlideOver";
import { Select } from "@/components/Select";
import { MetaForm } from "./MetaForm";
import { salvarMeta } from "./actions";

export type MetaRow = {
  unidadeId: string;
  unidadeNome: string;
  areaNome: string;
  fornecedorId: string | null;
  fornecedorNome: string | null;
  metaBuPresencial: number | null;
  metaBuDigital: number | null;
  verbaOrcada: number | null;
  verbaOrcadaPorNome: string | null;
  realizado: number;
  reservado: number;
  transferenciasSaldo: number;
  verbaExtra: number;
  transferenciasEntradaDetalhe: { unidadeNome: string; valor: number; data: string | null; aprovadoPorNome: string | null }[];
  transferenciasSaidaDetalhe: { unidadeNome: string; valor: number; data: string | null; aprovadoPorNome: string | null }[];
  verbaExtraDetalhe: { motivo: string; valor: number; data: string | null; analisadoPorNome: string | null }[];
  reservadoDetalhe: { servico: string; valor: number; status: string; data: string | null }[];
  planejamentoDetalhe: { tipoNome: string; valor: number; status: string; data: string | null }[];
  observacoes: string | null;
};

export type AreaAgregado = {
  areaNome: string;
  totalOrcado: number;
  totalRealizado: number;
  totalReservado: number;
  totalSaldo: number;
  totalVerbaExtra: number;
};

type Drawer = { type: "editar"; linha: MetaRow } | { type: "saldo"; linha: MetaRow } | null;

function formatDataBr(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCac(linha: MetaRow): string {
  const metaTotal = (linha.metaBuPresencial ?? 0) + (linha.metaBuDigital ?? 0);
  if (linha.verbaOrcada === null || metaTotal === 0) return "—";
  return formatMoeda(linha.verbaOrcada / metaTotal);
}

function formatRealizado(linha: MetaRow): string {
  return linha.verbaOrcada === null ? "—" : formatMoeda(linha.realizado);
}

function formatSaldo(linha: MetaRow): string {
  if (linha.verbaOrcada === null) return "—";
  return formatMoeda(
    linha.verbaOrcada - linha.realizado - linha.reservado + linha.transferenciasSaldo + linha.verbaExtra,
  );
}

function formatVerbaExtra(linha: MetaRow): string {
  return linha.verbaExtra === 0 ? "—" : formatMoeda(linha.verbaExtra);
}

function temAjuste(linha: MetaRow): boolean {
  return linha.transferenciasSaldo !== 0 || linha.verbaExtra !== 0 || linha.reservado !== 0;
}

const STATUS_RESERVADO_LABEL: Record<string, string> = {
  PENDENTE: "pendente",
  PRE_APROVADO: "pré-aprovado, aguardando regional",
  APROVADO: "aprovado, aguardando pagamento",
};

const STATUS_PLANEJAMENTO_RESERVADO_LABEL: Record<string, string> = {
  PENDENTE: "reservado, aguardando aprovação",
  APROVADO: "aprovado, aguardando execução",
};

function estourou(linha: MetaRow): boolean {
  return linha.verbaOrcada !== null && linha.realizado > linha.verbaOrcada;
}

export function MetasClient({
  ciclos,
  cicloSelecionadoId,
  cicloSelecionadoNome,
  linhas,
  agregadosPorArea,
  fornecedores,
  podeEditar,
}: {
  ciclos: { id: string; nome: string }[];
  cicloSelecionadoId: string;
  cicloSelecionadoNome: string;
  linhas: MetaRow[];
  agregadosPorArea: AreaAgregado[];
  fornecedores: { id: string; nome: string; bvPct: number | null; taxaPct: number | null }[];
  podeEditar: boolean;
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
    router.push(`/metas-e-valores?ciclo=${cicloId}`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-8 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-muted">Orçamento</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy">Metas e Valores</h1>
          </div>
          <div className="w-56 space-y-1.5">
            <p className="text-sm font-medium text-navy">Ciclo</p>
            <Select
              name="cicloId"
              options={ciclos.map((c) => ({ value: c.id, label: c.nome }))}
              defaultValue={cicloSelecionadoId}
              onChange={trocarCiclo}
            />
          </div>
        </div>

        {agregadosPorArea.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-4">
            {agregadosPorArea.map((a) => {
              const estourou = a.totalRealizado > a.totalOrcado;
              return (
                <div
                  key={a.areaNome}
                  className={`min-w-[280px] rounded-md border px-5 py-4 ${
                    estourou ? "border-error/40 bg-error/5" : "border-border bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[0.8125rem] font-medium text-navy">{a.areaNome}</p>
                    {estourou ? (
                      <span className="flex items-center gap-1 text-[0.75rem] font-medium text-error">
                        <TriangleAlert size={14} />
                        Estouro
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-x-5 gap-y-2.5">
                    <div>
                      <p className="text-[0.75rem] text-muted">Orçado</p>
                      <p className="text-[0.9375rem] font-medium text-navy">{formatMoeda(a.totalOrcado)}</p>
                    </div>
                    <div>
                      <p className="text-[0.75rem] text-muted">Realizado</p>
                      <p className={`text-[0.9375rem] font-medium ${estourou ? "text-error" : "text-navy"}`}>
                        {formatMoeda(a.totalRealizado)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.75rem] text-muted">Reservado</p>
                      <p className={`text-[0.9375rem] font-medium ${a.totalReservado > 0 ? "text-navy" : "text-muted"}`}>
                        {a.totalReservado > 0 ? formatMoeda(a.totalReservado) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.75rem] text-muted">Verba extra</p>
                      <p
                        className={`text-[0.9375rem] font-medium ${
                          a.totalVerbaExtra > 0 ? "text-cyan-deep" : "text-muted"
                        }`}
                      >
                        {a.totalVerbaExtra > 0 ? formatMoeda(a.totalVerbaExtra) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.75rem] text-muted">Saldo</p>
                      <p className={`text-[0.9375rem] font-medium ${a.totalSaldo < 0 ? "text-error" : "text-navy"}`}>
                        {formatMoeda(a.totalSaldo)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-8 pb-10">
        {ciclos.length === 0 ? (
          <p className="rounded-md border border-border px-5 py-4 text-[0.9375rem] text-muted">
            Nenhum ciclo cadastrado ainda. Cadastre um ciclo antes de definir metas e valores.
          </p>
        ) : linhas.length === 0 ? (
          <p className="rounded-md border border-border px-5 py-4 text-[0.9375rem] text-muted">
            Nenhuma unidade cadastrada ainda.
          </p>
        ) : (
          <div className="h-full overflow-y-auto rounded-md border border-border">
            <table className="w-full border-separate border-spacing-0 text-left text-[0.875rem]">
              <thead>
                <tr className="sticky top-0 z-10 bg-background text-muted">
                  <th className="border-b border-border px-5 py-2.5 font-medium">Área</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Unidade</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Fornecedor</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Meta Presencial</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Meta Digital</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Verba orçada</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">CAC</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Realizado</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Verba extra</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium">Saldo</th>
                  <th className="border-b border-border px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => {
                  const linhaEstourou = estourou(linha);
                  return (
                  <tr key={linha.unidadeId} className={`border-t border-border ${linhaEstourou ? "bg-error/5" : ""}`}>
                    <td className="px-5 py-2.5 text-navy">{linha.areaNome}</td>
                    <td className="px-5 py-2.5 text-navy">
                      <div className="flex items-center gap-1.5">
                        {linha.unidadeNome}
                        {linhaEstourou ? (
                          <span title="Realizado estourou a verba orçada">
                            <TriangleAlert size={14} className="shrink-0 text-error" />
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-navy">{linha.fornecedorNome ?? "—"}</td>
                    <td className="px-5 py-2.5 text-navy">{linha.metaBuPresencial ?? "—"}</td>
                    <td className="px-5 py-2.5 text-navy">{linha.metaBuDigital ?? "—"}</td>
                    <td className="px-5 py-2.5 text-navy">{formatMoeda(linha.verbaOrcada)}</td>
                    <td className="px-5 py-2.5 text-navy">{formatCac(linha)}</td>
                    <td className={`px-5 py-2.5 ${linhaEstourou ? "font-medium text-error" : "text-navy"}`}>
                      {formatRealizado(linha)}
                    </td>
                    <td className="px-5 py-2.5 text-navy">{formatVerbaExtra(linha)}</td>
                    <td className={`px-5 py-2.5 ${linhaEstourou ? "font-medium text-error" : "text-navy"}`}>
                      {linha.verbaOrcada !== null && temAjuste(linha) ? (
                        <button
                          type="button"
                          onClick={() => setDrawer({ type: "saldo", linha })}
                          className={linhaEstourou ? "hover:underline" : "text-cyan-deep hover:underline"}
                          title="Ver como esse saldo foi calculado"
                        >
                          {formatSaldo(linha)}
                        </button>
                      ) : (
                        formatSaldo(linha)
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {podeEditar ? (
                        <button
                          type="button"
                          onClick={() => setDrawer({ type: "editar", linha })}
                          className="text-cyan-deep hover:underline"
                        >
                          {linha.verbaOrcada === null ? "Criar meta" : "Editar"}
                        </button>
                      ) : null}
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
        open={drawer?.type === "editar"}
        onClose={closeDrawer}
        title={drawer?.type === "editar" && drawer.linha.verbaOrcada === null ? "Criar meta" : "Editar meta"}
      >
        {drawer?.type === "editar" ? (
          <MetaForm
            key={drawer.linha.unidadeId}
            action={salvarMeta.bind(null, drawer.linha.unidadeId, cicloSelecionadoId)}
            areaNome={drawer.linha.areaNome}
            unidadeNome={drawer.linha.unidadeNome}
            cicloNome={cicloSelecionadoNome}
            fornecedores={fornecedores}
            fornecedorIdInicial={drawer.linha.fornecedorId ?? ""}
            metaBuPresencialInicial={drawer.linha.metaBuPresencial?.toString() ?? ""}
            metaBuDigitalInicial={drawer.linha.metaBuDigital?.toString() ?? ""}
            verbaOrcadaInicial={drawer.linha.verbaOrcada?.toString() ?? ""}
            observacoesInicial={drawer.linha.observacoes ?? ""}
            onSuccess={handleSuccess}
            onCancel={closeDrawer}
          />
        ) : null}
      </SlideOver>

      <SlideOver open={drawer?.type === "saldo"} onClose={closeDrawer} title="Como esse saldo foi calculado">
        {drawer?.type === "saldo" ? (
          <div className="space-y-6 text-[0.875rem]">
            <div className="space-y-1 rounded-md border border-border bg-background px-3 py-2.5">
              <p>
                <span className="text-navy">{drawer.linha.areaNome}</span> ·{" "}
                <span className="text-navy">{drawer.linha.unidadeNome}</span>
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-navy">Verba orçada</p>
                  {drawer.linha.verbaOrcadaPorNome ? (
                    <p className="text-muted">por {drawer.linha.verbaOrcadaPorNome}</p>
                  ) : null}
                </div>
                <p className="shrink-0 text-navy">{formatMoeda(drawer.linha.verbaOrcada)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-navy">(−) Realizado (pedidos pagos + planejamento realizado)</p>
                <p className="text-navy">{formatMoeda(drawer.linha.realizado)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-navy">(−) Reservado (pedidos pendentes/aprovados + planejamento ainda não realizado)</p>
                <p className="text-navy">{formatMoeda(drawer.linha.reservado)}</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="font-medium text-navy">Pedidos que já reservam esse saldo</p>
              {drawer.linha.reservadoDetalhe.length === 0 ? (
                <p className="text-muted">Nenhum</p>
              ) : (
                drawer.linha.reservadoDetalhe.map((p, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted">
                        {p.servico}
                        {p.data ? ` (${formatDataBr(p.data)})` : ""}
                      </p>
                      <p className="text-muted">{STATUS_RESERVADO_LABEL[p.status] ?? p.status.toLowerCase()}</p>
                    </div>
                    <p className="shrink-0 text-navy">−{formatMoeda(p.valor)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="font-medium text-navy">Planejamento que já reserva esse saldo</p>
              {drawer.linha.planejamentoDetalhe.length === 0 ? (
                <p className="text-muted">Nenhum</p>
              ) : (
                drawer.linha.planejamentoDetalhe.map((p, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted">
                        {p.tipoNome}
                        {p.data ? ` (${formatDataBr(p.data)})` : ""}
                      </p>
                      <p className="text-muted">
                        {STATUS_PLANEJAMENTO_RESERVADO_LABEL[p.status] ?? p.status.toLowerCase()}
                      </p>
                    </div>
                    <p className="shrink-0 text-navy">−{formatMoeda(p.valor)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="font-medium text-navy">Transferências recebidas</p>
              {drawer.linha.transferenciasEntradaDetalhe.length === 0 ? (
                <p className="text-muted">Nenhuma</p>
              ) : (
                drawer.linha.transferenciasEntradaDetalhe.map((t, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted">
                        de {t.unidadeNome}
                        {t.data ? ` (${formatDataBr(t.data)})` : ""}
                      </p>
                      {t.aprovadoPorNome ? <p className="text-muted">aprovado por {t.aprovadoPorNome}</p> : null}
                    </div>
                    <p className="shrink-0 text-navy">+{formatMoeda(t.valor)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="font-medium text-navy">Transferências enviadas</p>
              {drawer.linha.transferenciasSaidaDetalhe.length === 0 ? (
                <p className="text-muted">Nenhuma</p>
              ) : (
                drawer.linha.transferenciasSaidaDetalhe.map((t, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted">
                        para {t.unidadeNome}
                        {t.data ? ` (${formatDataBr(t.data)})` : ""}
                      </p>
                      {t.aprovadoPorNome ? <p className="text-muted">aprovado por {t.aprovadoPorNome}</p> : null}
                    </div>
                    <p className="shrink-0 text-navy">−{formatMoeda(t.valor)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="font-medium text-navy">Verba extra aprovada</p>
              {drawer.linha.verbaExtraDetalhe.length === 0 ? (
                <p className="text-muted">Nenhuma</p>
              ) : (
                drawer.linha.verbaExtraDetalhe.map((v, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted">
                        {v.motivo}
                        {v.data ? ` (${formatDataBr(v.data)})` : ""}
                      </p>
                      {v.analisadoPorNome ? <p className="text-muted">aprovado por {v.analisadoPorNome}</p> : null}
                    </div>
                    <p className="shrink-0 text-navy">+{formatMoeda(v.valor)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="font-medium text-navy">Saldo disponível</p>
              <p className="font-medium text-navy">{formatSaldo(drawer.linha)}</p>
            </div>
          </div>
        ) : null}
      </SlideOver>
    </div>
  );
}

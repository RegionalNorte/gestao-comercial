"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Select } from "@/components/Select";
import { CurrencyInput } from "@/components/CurrencyInput";
import type { FormState } from "./actions";

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PedidoForm({
  action,
  unidades,
  onSuccess,
  onCancel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  unidades: {
    id: string;
    nome: string;
    areaNome: string;
    bvPct: number | null;
    taxaPct: number | null;
    saldoDisponivel: number | null;
  }[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const wasPending = useRef(false);
  const [formKey, setFormKey] = useState(0);
  const [unidadeId, setUnidadeId] = useState(state?.values?.unidadeId ?? "");
  const [valorLiquidoPlano, setValorLiquidoPlano] = useState(state?.values?.valorLiquido ?? "");

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (!state?.error) {
        onSuccess();
      } else {
        setFormKey((k) => k + 1);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, onSuccess]);

  const valores = state?.values;
  const ciclosAlternativos = state?.ciclosAlternativos;

  const unidadeAtual = unidades.find((u) => u.id === unidadeId);
  const valorLiquidoNum = Number(valorLiquidoPlano);
  const valorBrutoEstimado =
    unidadeAtual && unidadeAtual.bvPct !== null && unidadeAtual.taxaPct !== null && valorLiquidoNum > 0
      ? (() => {
          const bv = valorLiquidoNum * unidadeAtual.bvPct;
          const taxa = (valorLiquidoNum + bv) * unidadeAtual.taxaPct;
          return valorLiquidoNum + bv + taxa;
        })()
      : null;
  const vaiEstourar =
    valorBrutoEstimado !== null &&
    unidadeAtual?.saldoDisponivel !== null &&
    unidadeAtual?.saldoDisponivel !== undefined &&
    valorBrutoEstimado > unidadeAtual.saldoDisponivel;

  return (
    <form key={formKey} action={formAction} className="w-full space-y-6" noValidate>
      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Unidade</p>
        {unidades.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">
            Você não gerencia nenhuma unidade ainda. Peça ao Admin para vincular uma unidade ao seu usuário.
          </p>
        ) : (
          <Select
            name="unidadeId"
            options={unidades.map((u) => ({ value: u.id, label: `${u.areaNome} · ${u.nome}` }))}
            defaultValue={valores?.unidadeId ?? ""}
            onChange={setUnidadeId}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="dataDesejada" className="block text-sm font-medium text-navy">
          Data desejada de pagamento
        </label>
        <input
          id="dataDesejada"
          name="dataDesejada"
          type="date"
          required
          defaultValue={valores?.dataDesejada ?? ""}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
        <p className="text-[0.8125rem] text-muted">
          Essa data decide automaticamente de qual ciclo este pedido sai, se houver orçamento nele.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="servico" className="block text-sm font-medium text-navy">
          Serviço
        </label>
        <input
          id="servico"
          name="servico"
          type="text"
          required
          defaultValue={valores?.servico ?? ""}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="Ex.: Mídia digital"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="valorLiquido" className="block text-sm font-medium text-navy">
          Valor líquido (R$)
        </label>
        <CurrencyInput
          id="valorLiquido"
          name="valorLiquido"
          required
          defaultValue={valores?.valorLiquido ?? ""}
          placeholder="Ex.: 1.000"
          onValueChange={setValorLiquidoPlano}
        />
        {valorBrutoEstimado !== null ? (
          <p className={`text-[0.8125rem] ${vaiEstourar ? "text-error" : "text-muted"}`}>
            Valor bruto estimado, se aprovado e pago:{" "}
            <span className={`font-medium ${vaiEstourar ? "text-error" : "text-navy"}`}>
              {formatMoeda(valorBrutoEstimado)}
            </span>
          </p>
        ) : null}
        {vaiEstourar ? (
          <p className="text-[0.8125rem] font-medium text-error">
            Esse valor estoura o saldo disponível da unidade (
            {formatMoeda(unidadeAtual!.saldoDisponivel as number)}). Peça uma transferência de saldo ou verba extra
            antes de solicitar.
          </p>
        ) : null}
      </div>

      {ciclosAlternativos ? (
        <div className="space-y-1.5">
          <p className="block text-sm font-medium text-navy">Ciclo</p>
          {ciclosAlternativos.length === 0 ? (
            <p className="text-[0.8125rem] text-error">
              Nenhum ciclo aberto tem orçamento disponível para esta unidade no momento.
            </p>
          ) : (
            <>
              <Select
                name="cicloIdManual"
                options={ciclosAlternativos.map((c) => ({ value: c.id, label: c.nome }))}
                defaultValue={valores?.cicloIdManual ?? ""}
              />
              <p className="text-[0.8125rem] text-muted">
                A data informada não se encaixou automaticamente — escolha o ciclo para este pedido.
              </p>
            </>
          )}
        </div>
      ) : null}

      {state?.error ? (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || unidades.length === 0 || vaiEstourar}
          className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Enviando..." : "Solicitar"}
        </button>
        <button type="button" onClick={onCancel} className="text-[0.9375rem] text-muted hover:text-navy">
          Cancelar
        </button>
      </div>
    </form>
  );
}

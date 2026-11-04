"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Select } from "@/components/Select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { IntegerInput } from "@/components/IntegerInput";
import type { FormState } from "./actions";

type FornecedorOption = { id: string; nome: string; bvPct: number | null; taxaPct: number | null };

export function MetaForm({
  action,
  areaNome,
  unidadeNome,
  cicloNome,
  fornecedores,
  fornecedorIdInicial = "",
  metaBuPresencialInicial = "",
  metaBuDigitalInicial = "",
  verbaOrcadaInicial = "",
  observacoesInicial = "",
  onSuccess,
  onCancel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  areaNome: string;
  unidadeNome: string;
  cicloNome: string;
  fornecedores: FornecedorOption[];
  fornecedorIdInicial?: string;
  metaBuPresencialInicial?: string;
  metaBuDigitalInicial?: string;
  verbaOrcadaInicial?: string;
  observacoesInicial?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const wasPending = useRef(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (!state?.error) {
        onSuccess();
      } else {
        // Força o <form> a remontar para repopular os campos com o que foi
        // digitado (via state.values), já que o React reseta inputs não
        // controlados depois que a action roda — mesmo em caso de erro.
        setFormKey((k) => k + 1);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, onSuccess]);

  const valores = state?.values;
  const [fornecedorId, setFornecedorId] = useState(valores?.fornecedorId ?? fornecedorIdInicial);
  const fornecedorSelecionado = fornecedores.find((f) => f.id === fornecedorId);

  return (
    <form key={formKey} action={formAction} className="w-full space-y-6" noValidate>
      <div className="space-y-1 rounded-md border border-border bg-background px-3 py-2.5 text-[0.875rem] text-muted">
        <p>
          <span className="text-navy">{areaNome}</span> · <span className="text-navy">{unidadeNome}</span>
        </p>
        <p>Ciclo {cicloNome}</p>
      </div>

      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Fornecedor</p>
        <Select
          name="fornecedorId"
          options={[{ value: "", label: "Sem fornecedor" }, ...fornecedores.map((f) => ({ value: f.id, label: f.nome }))]}
          defaultValue={fornecedorId}
          onChange={setFornecedorId}
        />
        {fornecedorSelecionado ? (
          <p className="text-[0.8125rem] text-muted">
            {fornecedorSelecionado.bvPct !== null && fornecedorSelecionado.taxaPct !== null
              ? `BV ${(fornecedorSelecionado.bvPct * 100).toFixed(2).replace(/\.?0+$/, "")}% · Taxa ${(fornecedorSelecionado.taxaPct * 100).toFixed(2).replace(/\.?0+$/, "")}% — aplicados automaticamente nos pedidos desta unidade.`
              : "Esse fornecedor ainda não tem BV%/Taxa% cadastrados — a unidade não vai conseguir solicitar pedidos até isso ser completado em Fornecedores."}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="metaBuPresencial" className="block text-sm font-medium text-navy">
            Meta BU Presencial
          </label>
          <IntegerInput
            id="metaBuPresencial"
            name="metaBuPresencial"
            defaultValue={valores?.metaBuPresencial ?? metaBuPresencialInicial}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="metaBuDigital" className="block text-sm font-medium text-navy">
            Meta BU Digital
          </label>
          <IntegerInput
            id="metaBuDigital"
            name="metaBuDigital"
            defaultValue={valores?.metaBuDigital ?? metaBuDigitalInicial}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="verbaOrcada" className="block text-sm font-medium text-navy">
          Verba orçada (R$)
        </label>
        <CurrencyInput
          id="verbaOrcada"
          name="verbaOrcada"
          required
          defaultValue={valores?.verbaOrcada ?? verbaOrcadaInicial}
          placeholder="Ex.: 15.000"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="observacoes" className="block text-sm font-medium text-navy">
          Observações
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          defaultValue={valores?.observacoes ?? observacoesInicial}
          className="w-full resize-none rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={onCancel} className="text-[0.9375rem] text-muted hover:text-navy">
          Cancelar
        </button>
      </div>
    </form>
  );
}

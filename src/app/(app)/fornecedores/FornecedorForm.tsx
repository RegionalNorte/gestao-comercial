"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "./actions";

export function FornecedorForm({
  action,
  nomeInicial = "",
  abreviacaoInicial = "",
  codFornecedorInicial = "",
  contaContabilInicial = "",
  bvPctInicial = "",
  taxaPctInicial = "",
  onSuccess,
  onCancel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  nomeInicial?: string;
  abreviacaoInicial?: string;
  codFornecedorInicial?: string;
  contaContabilInicial?: string;
  bvPctInicial?: string;
  taxaPctInicial?: string;
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

  return (
    <form key={formKey} action={formAction} className="w-full space-y-6" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="nome" className="block text-sm font-medium text-navy">
          Nome do fornecedor
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          defaultValue={valores?.nome ?? nomeInicial}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="Ex.: Vortex Marketing Ltda"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="abreviacao" className="block text-sm font-medium text-navy">
          Abreviação
        </label>
        <input
          id="abreviacao"
          name="abreviacao"
          type="text"
          defaultValue={valores?.abreviacao ?? abreviacaoInicial}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="Ex.: VORTEX"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="codFornecedor" className="block text-sm font-medium text-navy">
            Código do fornecedor
          </label>
          <input
            id="codFornecedor"
            name="codFornecedor"
            type="text"
            defaultValue={valores?.codFornecedor ?? codFornecedorInicial}
            className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="contaContabil" className="block text-sm font-medium text-navy">
            Conta contábil
          </label>
          <input
            id="contaContabil"
            name="contaContabil"
            type="text"
            defaultValue={valores?.contaContabil ?? contaContabilInicial}
            className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Tipo de verba</p>
        <p className="rounded-md border border-border bg-background px-3 py-2.5 text-[0.9375rem] text-muted">
          V&amp;M
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="bvPct" className="block text-sm font-medium text-navy">
            BV%
          </label>
          <input
            id="bvPct"
            name="bvPct"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={valores?.bvPct ?? bvPctInicial}
            className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
            placeholder="Ex.: 10"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="taxaPct" className="block text-sm font-medium text-navy">
            Taxa%
          </label>
          <input
            id="taxaPct"
            name="taxaPct"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={valores?.taxaPct ?? taxaPctInicial}
            className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
            placeholder="Ex.: 16"
          />
        </div>
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

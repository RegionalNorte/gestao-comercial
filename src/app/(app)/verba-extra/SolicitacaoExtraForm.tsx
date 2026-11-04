"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Select } from "@/components/Select";
import { CurrencyInput } from "@/components/CurrencyInput";
import type { FormState } from "./actions";

export function SolicitacaoExtraForm({
  action,
  unidades,
  onSuccess,
  onCancel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  unidades: { id: string; nome: string; areaNome: string }[];
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
        setFormKey((k) => k + 1);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, onSuccess]);

  const valores = state?.values;

  return (
    <form key={formKey} action={formAction} className="w-full space-y-6" noValidate>
      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Unidade</p>
        {unidades.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">
            Você não gerencia nenhuma área ainda. Peça ao Admin para vincular uma área ao seu usuário.
          </p>
        ) : (
          <Select
            name="unidadeId"
            options={unidades.map((u) => ({ value: u.id, label: `${u.areaNome} · ${u.nome}` }))}
            defaultValue={valores?.unidadeId ?? ""}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="valor" className="block text-sm font-medium text-navy">
          Valor (R$)
        </label>
        <CurrencyInput id="valor" name="valor" required defaultValue={valores?.valor ?? ""} placeholder="Ex.: 1.000" />
        <p className="text-[0.8125rem] text-muted">
          Valor fora do orçamento já definido. Se aprovado, soma ao saldo da unidade, mas fica sempre visível
          separado da verba orçada original.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="motivo" className="block text-sm font-medium text-navy">
          Motivo
        </label>
        <textarea
          id="motivo"
          name="motivo"
          required
          rows={3}
          defaultValue={valores?.motivo ?? ""}
          className="w-full resize-none rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="Ex.: Brindes para ação de fim de ano"
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
          disabled={isPending || unidades.length === 0}
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

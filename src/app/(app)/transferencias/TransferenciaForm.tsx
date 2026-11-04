"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Select } from "@/components/Select";
import { CurrencyInput } from "@/components/CurrencyInput";
import type { FormState } from "./actions";

export function TransferenciaForm({
  action,
  unidadesOrigem,
  unidadesDestino,
  onSuccess,
  onCancel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  unidadesOrigem: { id: string; nome: string; areaNome: string }[];
  unidadesDestino: { id: string; nome: string; areaNome: string }[];
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
        <p className="block text-sm font-medium text-navy">Unidade de destino</p>
        {unidadesDestino.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">
            Você não gerencia nenhuma área ainda. Peça ao Admin para vincular uma área ao seu usuário.
          </p>
        ) : (
          <Select
            name="unidadeDestinoId"
            options={unidadesDestino.map((u) => ({ value: u.id, label: `${u.areaNome} · ${u.nome}` }))}
            defaultValue={valores?.unidadeDestinoId ?? ""}
          />
        )}
        <p className="text-[0.8125rem] text-muted">A unidade que vai receber o saldo.</p>
      </div>

      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Unidade de origem</p>
        <Select
          name="unidadeOrigemId"
          options={unidadesOrigem.map((u) => ({ value: u.id, label: `${u.areaNome} · ${u.nome}` }))}
          defaultValue={valores?.unidadeOrigemId ?? ""}
        />
        <p className="text-[0.8125rem] text-muted">
          A unidade que vai ceder o saldo. Se for de outra área, a transferência fica pendente até o Gerente de
          Área dela aceitar ou negar.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="valor" className="block text-sm font-medium text-navy">
          Valor (R$)
        </label>
        <CurrencyInput id="valor" name="valor" required defaultValue={valores?.valor ?? ""} placeholder="Ex.: 1.000" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="observacao" className="block text-sm font-medium text-navy">
          Observação
        </label>
        <textarea
          id="observacao"
          name="observacao"
          rows={3}
          defaultValue={valores?.observacao ?? ""}
          className="w-full resize-none rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="Opcional"
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
          disabled={isPending || unidadesDestino.length === 0}
          className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Enviando..." : "Transferir"}
        </button>
        <button type="button" onClick={onCancel} className="text-[0.9375rem] text-muted hover:text-navy">
          Cancelar
        </button>
      </div>
    </form>
  );
}

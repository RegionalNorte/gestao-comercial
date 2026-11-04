"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Select } from "@/components/Select";
import { CurrencyInput } from "@/components/CurrencyInput";
import type { FormState } from "./actions";

export function PlanejamentoForm({
  action,
  unidades,
  tipos,
  onSuccess,
  onCancel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  unidades: { id: string; nome: string; areaNome: string }[];
  tipos: { id: string; nome: string }[];
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
            Você não gerencia nenhuma unidade ainda. Peça ao Admin para vincular uma unidade ao seu usuário.
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
        <p className="block text-sm font-medium text-navy">Tipo de planejamento</p>
        {tipos.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">
            Nenhum tipo de planejamento cadastrado ainda. Peça ao Admin/Analista para cadastrar um (ex.: ENEM).
          </p>
        ) : (
          <Select
            name="tipoPlanejamentoId"
            options={tipos.map((t) => ({ value: t.id, label: t.nome }))}
            defaultValue={valores?.tipoPlanejamentoId ?? ""}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="valor" className="block text-sm font-medium text-navy">
          Valor (R$)
        </label>
        <CurrencyInput id="valor" name="valor" required defaultValue={valores?.valor ?? ""} placeholder="Ex.: 5.000" />
        <p className="text-[0.8125rem] text-muted">
          Se aprovado pelo Gerente de Área e pelo Gerente Regional, esse valor é reservado no saldo da unidade.
        </p>
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
          disabled={isPending || unidades.length === 0 || tipos.length === 0}
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

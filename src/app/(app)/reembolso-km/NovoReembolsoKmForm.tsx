"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Select } from "@/components/Select";
import type { FormState } from "./actions";

export function NovoReembolsoKmForm({
  action,
  unidades,
  onSuccess,
  onCancel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  unidades: { id: string; nome: string; areaNome: string }[];
  onSuccess: (aviso?: string) => void;
  onCancel: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const wasPending = useRef(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (!state?.error) {
        onSuccess(state?.aviso);
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
        <Select
          name="unidadeId"
          options={unidades.map((u) => ({ value: u.id, label: `${u.nome} — ${u.areaNome}` }))}
          defaultValue={valores?.unidadeId ?? (unidades.length === 1 ? unidades[0].id : "")}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="arquivo" className="block text-sm font-medium text-navy">
          Relatório de Km Rodado (PDF)
        </label>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          accept="application/pdf"
          required
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors file:mr-3 file:rounded-md file:border-0 file:bg-background file:px-3 file:py-1.5 file:text-[0.875rem] file:text-navy focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
        <p className="text-[0.8125rem] text-muted">
          Os dados (colaborador, equipe, período, KM e valor) são extraídos automaticamente do PDF.
        </p>
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
          {isPending ? "Enviando..." : "Enviar"}
        </button>
        <button type="button" onClick={onCancel} className="text-[0.9375rem] text-muted hover:text-navy">
          Cancelar
        </button>
      </div>
    </form>
  );
}

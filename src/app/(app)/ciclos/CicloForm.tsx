"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Select } from "@/components/Select";
import type { FormState } from "./actions";

const STATUS_OPTIONS = [
  { value: "Aberto", label: "Aberto" },
  { value: "Fechado", label: "Fechado" },
];

export function CicloForm({
  action,
  nomeInicial = "",
  dataInicioInicial = "",
  dataFimInicial = "",
  statusInicial = "Aberto",
  onSuccess,
  onCancel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  nomeInicial?: string;
  dataInicioInicial?: string;
  dataFimInicial?: string;
  statusInicial?: string;
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
          Nome do ciclo
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          defaultValue={valores?.nome ?? nomeInicial}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="Ex.: 27.1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="dataInicio" className="block text-sm font-medium text-navy">
            Início
          </label>
          <input
            id="dataInicio"
            name="dataInicio"
            type="date"
            defaultValue={valores?.dataInicio ?? dataInicioInicial}
            className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="dataFim" className="block text-sm font-medium text-navy">
            Fim
          </label>
          <input
            id="dataFim"
            name="dataFim"
            type="date"
            defaultValue={valores?.dataFim ?? dataFimInicial}
            className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Status</p>
        <Select name="status" options={STATUS_OPTIONS} defaultValue={valores?.status ?? statusInicial} />
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

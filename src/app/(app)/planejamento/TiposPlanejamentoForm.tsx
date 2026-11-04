"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "./actions";

export function TiposPlanejamentoForm({
  action,
  onSuccess,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  onSuccess: () => void;
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
    <form key={formKey} action={formAction} className="flex items-start gap-3">
      <div className="flex-1 space-y-1.5">
        <input
          name="nome"
          type="text"
          required
          defaultValue={valores?.nome ?? ""}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="Ex.: ENEM"
        />
        {state?.error ? (
          <p role="alert" className="text-[0.8125rem] text-error">
            {state.error}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Salvando..." : "Adicionar"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "./actions";

export function DecisaoPlanejamentoForm({
  action,
  titulo,
  onSuccess,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  titulo: string;
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

  return (
    <form key={formKey} action={formAction} className="space-y-4">
      <p className="text-sm font-medium text-navy">{titulo}</p>

      {state?.error ? (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          name="decisao"
          value="APROVADO"
          disabled={isPending}
          className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Aprovar
        </button>
        <button
          type="submit"
          name="decisao"
          value="REJEITADO"
          disabled={isPending}
          className="rounded-md border border-error px-4 py-2.5 text-[0.9375rem] font-medium text-error transition-colors hover:bg-error/5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Rejeitar
        </button>
      </div>
    </form>
  );
}

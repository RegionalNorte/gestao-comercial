"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "./actions";

export function DecisaoExtraForm({
  action,
  onSuccess,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const wasPending = useRef(false);
  const [formKey, setFormKey] = useState(0);
  const comentarioRef = useRef<HTMLTextAreaElement>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

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
    <form key={formKey} action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="comentarioAnalista" className="block text-sm font-medium text-navy">
          Comentário
        </label>
        <textarea
          id="comentarioAnalista"
          name="comentarioAnalista"
          ref={comentarioRef}
          rows={3}
          defaultValue={valores?.comentarioAnalista ?? ""}
          onChange={() => setErroLocal(null)}
          className="w-full resize-none rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
        <p className="text-[0.8125rem] text-muted">Opcional para aprovar. Obrigatório para rejeitar (justifique o motivo).</p>
      </div>

      {erroLocal ?? state?.error ? (
        <p role="alert" className="text-sm text-error">
          {erroLocal ?? state?.error}
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
          onClick={(e) => {
            if (!comentarioRef.current?.value.trim()) {
              e.preventDefault();
              setErroLocal("Informe uma justificativa para rejeitar a solicitação.");
              comentarioRef.current?.focus();
            }
          }}
          className="rounded-md border border-error px-4 py-2.5 text-[0.9375rem] font-medium text-error transition-colors hover:bg-error/5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Rejeitar
        </button>
      </div>
    </form>
  );
}

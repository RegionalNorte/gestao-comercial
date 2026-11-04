"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "./actions";

// Reaproveitado nas 2 etapas de decisão do Reembolso KM (pré-aprovação comercial e
// aprovação regional final) — só muda o rótulo/valor do botão de aprovar.
export function DecisaoReembolsoKmForm({
  action,
  onSuccess,
  aprovarLabel = "Aprovar",
  aprovarValor = "APROVADO",
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  onSuccess: () => void;
  aprovarLabel?: string;
  aprovarValor?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const wasPending = useRef(false);
  const [formKey, setFormKey] = useState(0);
  const comentariosRef = useRef<HTMLTextAreaElement>(null);
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
        <label htmlFor="comentarios" className="block text-sm font-medium text-navy">
          Comentário
        </label>
        <textarea
          id="comentarios"
          name="comentarios"
          ref={comentariosRef}
          rows={3}
          defaultValue={valores?.comentarios ?? ""}
          onChange={() => setErroLocal(null)}
          className="w-full resize-none rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
        <p className="text-[0.8125rem] text-muted">
          Opcional para {aprovarLabel.toLowerCase()}. Obrigatório para rejeitar (justifique o motivo).
        </p>
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
          value={aprovarValor}
          disabled={isPending}
          className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {aprovarLabel}
        </button>
        <button
          type="submit"
          name="decisao"
          value="REJEITADO"
          disabled={isPending}
          onClick={(e) => {
            if (!comentariosRef.current?.value.trim()) {
              e.preventDefault();
              setErroLocal("Informe uma justificativa nas observações para rejeitar.");
              comentariosRef.current?.focus();
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

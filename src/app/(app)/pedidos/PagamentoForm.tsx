"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "./actions";

export function PagamentoForm({
  action,
  onSuccess,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) onSuccess();
    wasPending.current = isPending;
  }, [isPending, state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Confirmando..." : "Marcar como pago"}
      </button>
    </form>
  );
}

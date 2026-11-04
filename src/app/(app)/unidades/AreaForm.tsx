"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FormState } from "./actions";

type GestorOption = { id: string; nome: string; email: string };

export function AreaForm({
  action,
  nomeInicial = "",
  gestores,
  gestorIdsSelecionados = [],
  onSuccess,
  onCancel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  nomeInicial?: string;
  gestores: GestorOption[];
  gestorIdsSelecionados?: string[];
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
        // digitado/marcado (via state.values/gestorIds), já que o React reseta
        // inputs não controlados depois que a action roda — mesmo em caso de erro.
        setFormKey((k) => k + 1);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state, onSuccess]);

  const valores = state?.values;
  const gestorIdsAtuais = state?.gestorIds ?? gestorIdsSelecionados;

  return (
    <form key={formKey} action={formAction} className="w-full space-y-6" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="nome" className="block text-sm font-medium text-navy">
          Nome da área
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          defaultValue={valores?.nome ?? nomeInicial}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="Ex.: Cerrado"
        />
      </div>

      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Gerente(s) de Área</p>
        {gestores.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">
            Nenhum usuário com perfil &quot;Gerente de Área&quot; cadastrado ainda. Cadastre em{" "}
            <Link href="/usuarios" className="text-cyan-deep underline">
              Usuários
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-1.5 rounded-md border border-border p-3">
            {gestores.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-[0.9375rem] text-navy">
                <input
                  type="checkbox"
                  name="gestores"
                  value={g.id}
                  defaultChecked={gestorIdsAtuais.includes(g.id)}
                  className="accent-cyan"
                />
                {g.nome} <span className="text-muted">({g.email})</span>
              </label>
            ))}
          </div>
        )}
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
        <button
          type="button"
          onClick={onCancel}
          className="text-[0.9375rem] text-muted hover:text-navy"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

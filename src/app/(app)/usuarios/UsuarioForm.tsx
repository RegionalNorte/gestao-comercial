"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Select } from "@/components/Select";
import type { FormState } from "./actions";

const PERFIL_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "ANALISTA", label: "Analista" },
  { value: "GERENTE_REGIONAL", label: "Gerente Regional" },
  { value: "GERENTE_AREA", label: "Gerente de Área" },
  { value: "GERENTE_UNIDADE", label: "Gerente de Unidade" },
  { value: "GERENTE_COMERCIAL", label: "Gerente Comercial" },
];

export function UsuarioForm({
  action,
  nomeInicial = "",
  emailInicial = "",
  perfilInicial = "",
  ehEdicao = false,
  onSuccess,
  onCancel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  nomeInicial?: string;
  emailInicial?: string;
  perfilInicial?: string;
  ehEdicao?: boolean;
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
        <label htmlFor="nome" className="block text-sm font-medium text-navy">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          defaultValue={valores?.nome ?? nomeInicial}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="Ex.: Maria Silva"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-navy">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={valores?.email ?? emailInicial}
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="maria@empresa.com"
        />
      </div>

      <div className="space-y-1.5">
        <p className="block text-sm font-medium text-navy">Perfil</p>
        <Select name="perfil" options={PERFIL_OPTIONS} defaultValue={valores?.perfil ?? perfilInicial} />
      </div>

      {!ehEdicao ? (
        <p className="text-[0.8125rem] text-muted">
          O usuário define a própria senha no primeiro acesso: avise que ele já pode tentar entrar com este
          e-mail.
        </p>
      ) : null}

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

"use client";

import { useActionState } from "react";
import { criarSenha } from "./actions";

export function CriarSenhaForm() {
  const [state, formAction, isPending] = useActionState(criarSenha, undefined);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-6" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="senha" className="block text-sm font-medium text-navy">
          Nova senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmarSenha" className="block text-sm font-medium text-navy">
          Confirmar senha
        </label>
        <input
          id="confirmarSenha"
          name="confirmarSenha"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-[0.9375rem] text-navy outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-navy px-4 py-2.5 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Salvando..." : "Definir senha e entrar"}
      </button>
    </form>
  );
}
